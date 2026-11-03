<?php

declare(strict_types=1);

namespace App\Command;

use App\Billing\UserTime;
use App\Clock\Clock;
use App\Entity\ReminderLog;
use App\Entity\User;
use App\Reminder\DueReminder;
use App\Reminder\ReminderMailer;
use App\Reminder\ReminderPlanner;
use App\Repository\ReminderLogRepository;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * Scheduled hourly (after app:subscriptions:advance-billing-dates). Each user is handled once
 * per local day, on the first run after 01:00 in their time zone; later runs that day skip them.
 * Exits with FAILURE when any digest couldn't be sent (those users are retried next run).
 */
#[AsCommand(
    name: 'app:reminders:send',
    description: 'Emails each user a daily digest of upcoming payments, after 01:00 in their time zone',
)]
final class SendRemindersCommand extends Command
{
    /** Digests go out on the first run after this local hour. */
    public const int SEND_FROM_LOCAL_HOUR = 1;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly SubscriptionRepository $subscriptionRepository,
        private readonly ReminderLogRepository $reminderLogRepository,
        private readonly ReminderPlanner $planner,
        private readonly ReminderMailer $mailer,
        private readonly EntityManagerInterface $entityManager,
        private readonly Clock $clock,
        private readonly LoggerInterface $logger,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'List the reminders that would be sent, without sending or saving')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'Only process the user with this email');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $dryRun = (bool) $input->getOption('dry-run');
        $users = $this->users($input->getOption('user'));
        if (null === $users) {
            $io->error('No user with that email and payment reminders turned on.');

            return Command::FAILURE;
        }

        $now = $this->clock->now();
        $stats = ['sent' => 0, 'nothing due' => 0, 'not yet 01:00' => 0, 'already done today' => 0, 'failed' => 0];

        foreach ($users as $user) {
            $outcome = $this->processUser($user, $now, $dryRun, $io);
            ++$stats[$outcome];
            $this->entityManager->clear();
        }

        $summary = implode(', ', array_map(static fn (string $label, int $count): string => sprintf('%s: %d', $label, $count), array_keys($stats), $stats));
        if ($stats['failed'] > 0) {
            $io->error(sprintf('Some digests could not be sent and will be retried. %s', $summary));

            return Command::FAILURE;
        }
        $io->success(($dryRun ? 'Dry run. ' : '').$summary);

        return Command::SUCCESS;
    }

    private function processUser(User $user, \DateTimeImmutable $now, bool $dryRun, SymfonyStyle $io): string
    {
        if ((int) UserTime::localNow($user, $now)->format('G') < self::SEND_FROM_LOCAL_HOUR) {
            return 'not yet 01:00';
        }
        $today = UserTime::today($user, $now);
        $previous = $user->getRemindersProcessedOn();
        if (null !== $previous && $previous >= $today) {
            return 'already done today';
        }

        $subscriptions = $this->subscriptionRepository->findBillableForUser($user);
        $due = $this->planner->plan($subscriptions, $today, $this->reminderLogRepository->findSentKeys($subscriptions, $today));

        if ($dryRun) {
            foreach ($due as $reminder) {
                $io->writeln(sprintf('  %s: %s %s on %s', $user->getEmail(), $reminder->subscription->getServiceName(), $reminder->kind, $reminder->chargeDate->format('Y-m-d')));
            }

            return [] === $due ? 'nothing due' : 'sent';
        }

        if (!$this->userRepository->claimReminderRun($user, $today)) {
            return 'already done today';
        }
        if ([] === $due) {
            return 'nothing due';
        }

        try {
            $this->mailer->sendDigest($user, $due);
        } catch (TransportExceptionInterface $exception) {
            $this->userRepository->releaseReminderRun($user, $previous);
            $this->logger->error('Could not send the payment reminder digest.', ['user_id' => $user->getId(), 'exception_class' => $exception::class]);

            return 'failed';
        }

        $this->recordSent($due, $now);

        return 'sent';
    }

    /**
     * @param list<DueReminder> $due
     */
    private function recordSent(array $due, \DateTimeImmutable $now): void
    {
        foreach ($due as $reminder) {
            $this->reminderLogRepository->recordSent($reminder->subscription, $reminder->kind, $reminder->chargeDate, $now);
            if (ReminderLog::KIND_TRIAL_ENDING === $reminder->kind) {
                $reminder->subscription->setTrialReminderSentAt($now);
            }
        }
        $this->entityManager->flush();
    }

    /**
     * @return list<User>|null null when a requested user doesn't exist, has reminders off, or hasn't verified their email
     */
    private function users(mixed $email): ?array
    {
        if (\is_string($email) && '' !== $email) {
            $user = $this->userRepository->findOneByEmail($email);

            return null === $user || !$user->canReceiveReminders() ? null : [$user];
        }

        return array_values($this->userRepository->findReminderRecipients());
    }
}
