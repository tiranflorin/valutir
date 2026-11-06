<?php

declare(strict_types=1);

namespace App\Command;

use App\Billing\BillingDateAdvancer;
use App\Billing\UserTime;
use App\Clock\Clock;
use App\Entity\User;
use App\Payment\FreePlanLimit;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Safe to run at any time and repeatedly (it only touches dates that have passed).
 * Scheduled hourly, before app:reminders:send.
 */
#[AsCommand(
    name: 'app:subscriptions:advance-billing-dates',
    description: 'Resumes paused subscriptions on their resume date, moves past next billing dates forward and turns ended trials active (per user time zone)',
)]
final class AdvanceBillingDatesCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly SubscriptionRepository $subscriptionRepository,
        private readonly BillingDateAdvancer $advancer,
        private readonly EntityManagerInterface $entityManager,
        private readonly Clock $clock,
        private readonly FreePlanLimit $freePlanLimit,
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
            $updated += $this->resumePaused($user, $today, $dryRun, $io);
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
     * Makes paused subscriptions active again on their resume date, before their dates are advanced.
     * Resuming counts towards the free plan's limit like any other write: one that doesn't fit stays
     * paused and is retried on the next run.
     */
    private function resumePaused(User $user, \DateTimeImmutable $today, bool $dryRun, SymfonyStyle $io): int
    {
        $due = $this->subscriptionRepository->findDueToResumeForUser($user, $today);
        if ($dryRun || [] === $due) {
            foreach ($due as $subscription) {
                $io->writeln(sprintf('  #%d %s: would resume (paused until %s)', $subscription->getId(), $subscription->getServiceName(), $subscription->getResumesOn()?->format('Y-m-d')), OutputInterface::VERBOSITY_VERBOSE);
            }

            return \count($due);
        }

        return $this->entityManager->wrapInTransaction(function () use ($user, $due, $io): int {
            $resumed = 0;
            foreach ($due as $subscription) {
                try {
                    $this->freePlanLimit->assertCanSave($user, $subscription, 'active');
                } catch (HttpException) {
                    $io->writeln(sprintf('  #%d %s: stays paused, the free plan limit is reached', $subscription->getId(), $subscription->getServiceName()), OutputInterface::VERBOSITY_VERBOSE);
                    continue;
                }
                $resumedFrom = $subscription->getResumesOn()?->format('Y-m-d');
                $subscription->setStatus('active');
                $subscription->setResumesOn(null);
                // Flushed one by one so the limit check counts the ones resumed before it.
                $this->entityManager->flush();
                ++$resumed;
                $io->writeln(sprintf('  #%d %s: resumed (paused until %s)', $subscription->getId(), $subscription->getServiceName(), $resumedFrom), OutputInterface::VERBOSITY_VERBOSE);
            }

            return $resumed;
        });
    }

    /**
     * @return list<User>|null null when a requested user doesn't exist
     */
    private function users(mixed $email): ?array
    {
        if (\is_string($email) && '' !== $email) {
            $user = $this->userRepository->findOneByEmail($email);

            return null === $user ? null : [$user];
        }

        return array_values($this->userRepository->findAll());
    }
}
