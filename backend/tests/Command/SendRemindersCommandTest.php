<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Billing\BillingSchedule;
use App\Billing\CalendarDay;
use App\Clock\Clock;
use App\Command\SendRemindersCommand;
use App\Entity\Subscription;
use App\Entity\User;
use App\Reminder\ReminderMailer;
use App\Reminder\ReminderPlanner;
use App\Reminder\UnsubscribeToken;
use App\Repository\ReminderLogRepository;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

// The repository and mailer mocks are shared fixtures; each test asserts only the calls it cares about.
#[AllowMockObjectsWithoutExpectations]
final class SendRemindersCommandTest extends TestCase
{
    /** 06:00 UTC on 2 Nov = 07:00 in Berlin; a monthly charge on 4 Nov is 2 days away (lead time 3). */
    private const string NOW = '2026-11-02 06:00:00';

    private UserRepository&MockObject $users;
    private ReminderLogRepository&MockObject $log;
    private MailerInterface&MockObject $mailer;

    public function testSendsOneDigestAndRecordsTheReminder(): void
    {
        $user = $this->user();
        $this->users->expects(self::once())->method('claimReminderRun')->with($user, self::callback(static fn (\DateTimeImmutable $d): bool => '2026-11-02' === $d->format('Y-m-d')))->willReturn(true);
        $this->users->expects(self::never())->method('releaseReminderRun');
        $this->mailer->expects(self::once())->method('send');
        $this->log->expects(self::once())->method('recordSent');

        $tester = $this->tester([$user], [$this->subscription('2026-11-04')]);

        self::assertSame(Command::SUCCESS, $tester->execute([]));
        self::assertStringContainsString('sent: 1', $tester->getDisplay());
    }

    public function testWaitsUntilOneOClockInTheUsersTimeZone(): void
    {
        // 23:30 UTC on 1 Nov is 00:30 in Berlin: too early.
        $this->users->expects(self::never())->method('claimReminderRun');
        $this->mailer->expects(self::never())->method('send');

        $tester = $this->tester([$this->user()], [$this->subscription('2026-11-04')], '2026-11-01 23:30:00');

        self::assertSame(Command::SUCCESS, $tester->execute([]));
        self::assertStringContainsString('not yet 01:00: 1', $tester->getDisplay());
    }

    public function testSkipsUsersAlreadyHandledToday(): void
    {
        $user = $this->user();
        (new \ReflectionProperty(User::class, 'remindersProcessedOn'))->setValue($user, CalendarDay::fromString('2026-11-02'));
        $this->users->expects(self::never())->method('claimReminderRun');
        $this->mailer->expects(self::never())->method('send');

        $tester = $this->tester([$user], [$this->subscription('2026-11-04')]);

        self::assertSame(Command::SUCCESS, $tester->execute([]));
        self::assertStringContainsString('already done today: 1', $tester->getDisplay());
    }

    public function testFailedSendReleasesTheClaimAndFailsTheRun(): void
    {
        $user = $this->user();
        $this->users->method('claimReminderRun')->willReturn(true);
        $this->users->expects(self::once())->method('releaseReminderRun')->with($user, null);
        $this->mailer->method('send')->willThrowException(new TransportException('SES unavailable'));
        $this->log->expects(self::never())->method('recordSent');

        $tester = $this->tester([$user], [$this->subscription('2026-11-04')]);

        self::assertSame(Command::FAILURE, $tester->execute([]));
        self::assertStringContainsString('failed: 1', $tester->getDisplay());
    }

    public function testDryRunNeitherClaimsNorSends(): void
    {
        $this->users->expects(self::never())->method('claimReminderRun');
        $this->mailer->expects(self::never())->method('send');

        $tester = $this->tester([$this->user()], [$this->subscription('2026-11-04')]);

        self::assertSame(Command::SUCCESS, $tester->execute(['--dry-run' => true]));
        self::assertStringContainsString('ada@example.test: Netflix renewal on 2026-11-04', $tester->getDisplay());
    }

    public function testDayWithNothingDueIsStillMarkedDone(): void
    {
        $this->users->expects(self::once())->method('claimReminderRun')->willReturn(true);
        $this->mailer->expects(self::never())->method('send');

        $tester = $this->tester([$this->user()], [$this->subscription('2026-11-20')]);

        self::assertSame(Command::SUCCESS, $tester->execute([]));
        self::assertStringContainsString('nothing due: 1', $tester->getDisplay());
    }

    protected function setUp(): void
    {
        $this->users = $this->createMock(UserRepository::class);
        $this->log = $this->createMock(ReminderLogRepository::class);
        $this->log->method('findSentKeys')->willReturn([]);
        $this->mailer = $this->createMock(MailerInterface::class);
    }

    /**
     * @param list<User>         $users
     * @param list<Subscription> $subscriptions
     */
    private function tester(array $users, array $subscriptions, string $utcNow = self::NOW): CommandTester
    {
        $this->users->method('findWithRemindersEnabled')->willReturn($users);
        $subscriptionRepository = $this->createStub(SubscriptionRepository::class);
        $subscriptionRepository->method('findBillableForUser')->willReturn($subscriptions);
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable($utcNow, new \DateTimeZone('UTC')));
        $urls = $this->createStub(UrlGeneratorInterface::class);
        $urls->method('generate')->willReturn('https://api.test/unsubscribe');

        return new CommandTester(new SendRemindersCommand(
            $this->users,
            $subscriptionRepository,
            $this->log,
            new ReminderPlanner(new BillingSchedule()),
            new ReminderMailer($this->mailer, new UnsubscribeToken('secret'), $urls, 'http://frontend.test'),
            $this->createStub(EntityManagerInterface::class),
            $clock,
            new NullLogger(),
        ));
    }

    private function user(): User
    {
        $user = (new User())->setEmail('ada@example.test')->setName('Ada');
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, 1);

        return $user;
    }

    private function subscription(string $nextBillingDate): Subscription
    {
        $subscription = (new Subscription())->setServiceName('Netflix')->setAmount('13.99')->setCurrency('EUR')
            ->setBillingCadence('monthly')->setNextBillingDate(CalendarDay::fromString($nextBillingDate));
        $subscription->setStatus('active');
        (new \ReflectionProperty(Subscription::class, 'id'))->setValue($subscription, 10);

        return $subscription;
    }
}
