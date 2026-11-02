<?php

declare(strict_types=1);

namespace App\Command;

use App\Billing\BillingDateAdvancer;
use App\Billing\UserTime;
use App\Clock\Clock;
use App\Entity\User;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Safe to run at any time and repeatedly (it only touches dates that have passed).
 * Scheduled hourly, before app:reminders:send.
 */
#[AsCommand(
    name: 'app:subscriptions:advance-billing-dates',
    description: 'Moves past next billing dates forward and turns ended trials active (per user time zone)',
)]
final class AdvanceBillingDatesCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly SubscriptionRepository $subscriptionRepository,
        private readonly BillingDateAdvancer $advancer,
        private readonly EntityManagerInterface $entityManager,
        private readonly Clock $clock,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show what would change without saving')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'Only process the user with this email');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $dryRun = (bool) $input->getOption('dry-run');
        $users = $this->users($input->getOption('user'));
        if (null === $users) {
            $io->error('No user with that email.');

            return Command::FAILURE;
        }

        $now = $this->clock->now();
        $updated = 0;
        foreach ($users as $user) {
            $today = UserTime::today($user, $now);
            foreach ($this->subscriptionRepository->findBillableForUser($user) as $subscription) {
                $changes = $this->advancer->advance($subscription, $today);
                if ([] === $changes) {
                    continue;
                }
                ++$updated;
                $io->writeln(sprintf('  #%d %s: %s', $subscription->getId(), $subscription->getServiceName(), implode('; ', $changes)), OutputInterface::VERBOSITY_VERBOSE);
            }

            if (!$dryRun) {
                $this->entityManager->flush();
            }
            // Keep memory flat across users (and discard unsaved changes in a dry run).
            $this->entityManager->clear();
        }

        $io->success(sprintf('%s %d subscription(s) for %d user(s).', $dryRun ? 'Would update' : 'Updated', $updated, \count($users)));

        return Command::SUCCESS;
    }

    /**
     * @return list<User>|null null when a requested user doesn't exist
     */
    private function users(mixed $email): ?array
    {
        if (\is_string($email) && '' !== $email) {
            $user = $this->userRepository->findOneBy(['email' => $email]);

            return null === $user ? null : [$user];
        }

        return array_values($this->userRepository->findAll());
    }
}
