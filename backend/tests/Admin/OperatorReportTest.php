<?php

declare(strict_types=1);

namespace App\Tests\Admin;

use App\Admin\OperatorReport;
use App\Clock\Clock;
use App\Entity\Purchase;
use App\Entity\User;
use App\Payment\FreePlanLimit;
use App\Repository\PurchaseRepository;
use App\Repository\ReminderLogRepository;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\AbstractLogger;

final class OperatorReportTest extends TestCase
{
    public const string NOW = '2026-11-22 12:00:00';

    /** @var list<array{string, array<string, mixed>}> */
    private array $logged = [];

    public function testTheNearLimitThresholdIsBelowTheFreeLimit(): void
    {
        self::assertLessThan(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS, OperatorReport::NEAR_LIMIT);
    }

    public function testTheOverviewCountsAccountsPurchasesAndBackgroundWork(): void
    {
        $users = $this->createStub(UserRepository::class);
        $users->method('countAccounts')->willReturn(['total' => 12, 'verified' => 9, 'paid' => 3, 'free' => 8, 'admins' => 1]);
        $users->method('countCreatedSince')->willReturnCallback(
            static fn (\DateTimeImmutable $since): int => '2026-11-15' === $since->format('Y-m-d') ? 2 : 5,
        );
        $users->method('findLatestReminderDay')->willReturn(new \DateTimeImmutable('2026-11-22'));

        $subscriptions = $this->createMock(SubscriptionRepository::class);
        $subscriptions->expects(self::once())->method('countFreeAccountsWithAtLeast')
            ->with(OperatorReport::NEAR_LIMIT, FreePlanLimit::COUNTED_STATUSES)->willReturn(4);

        $purchases = $this->createMock(PurchaseRepository::class);
        $purchases->method('countByStatus')->willReturn(['paid' => 3, 'refunded' => 1]);
        $purchases->method('sumPaidByCurrency')->willReturn(['EUR' => 5997]);
        // Pending for more than an hour means the webhook didn't settle the checkout.
        $purchases->expects(self::once())->method('findStalePendingSummary')
            ->with(new \DateTimeImmutable('2026-11-22 11:00:00'))
            ->willReturn(['count' => 1, 'oldest' => new \DateTimeImmutable('2026-11-22 09:30:00')]);

        $reminderLogs = $this->createMock(ReminderLogRepository::class);
        $reminderLogs->expects(self::once())->method('countSentSince')->with(new \DateTimeImmutable('2026-11-21 12:00:00'))->willReturn(17);

        $overview = $this->report($users, $subscriptions, $purchases, $reminderLogs)->overview($this->admin());

        self::assertSame(['total' => 12, 'verified' => 9, 'paid' => 3, 'free' => 8, 'admins' => 1, 'unverified' => 3, 'createdLast7Days' => 2, 'createdLast30Days' => 5], $overview['accounts']);
        self::assertSame(['threshold' => 30, 'limit' => FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS, 'accounts' => 4], $overview['nearFreeLimit']);
        self::assertSame(['byStatus' => ['paid' => 3, 'refunded' => 1], 'paidByCurrency' => ['EUR' => 5997]], $overview['purchases']);
        self::assertSame([
            'stalePendingPurchases' => 1,
            'oldestStalePendingAt' => '2026-11-22T09:30:00+00:00',
            'remindersSentLast24Hours' => 17,
            'latestReminderDay' => '2026-11-22',
        ], $overview['health']);
        self::assertSame([['Admin viewed the overview.', ['admin_user_id' => 1]]], $this->logged);
    }

    public function testALookupShowsTheAccountStatusAndNothingSecret(): void
    {
        $user = (new User())->setEmail('ada@example.test')->setPassword('hashed-password');
        $this->setId($user, 42);
        $user->markEmailVerified(new \DateTimeImmutable('2026-11-01 08:00:00'));
        $user->revokeAllTokens();

        $users = $this->createStub(UserRepository::class);
        $users->method('findOneByEmail')->willReturnCallback(static fn (string $email): ?User => 'ADA@example.test' === $email ? $user : null);
        $purchases = $this->createStub(PurchaseRepository::class);
        $refunded = new Purchase($user, 'lifetime_unlock', 'cs_test_secret_session', 1999, 'eur', new \DateTimeImmutable('2026-11-02 10:00:00'));
        $refunded->setStripePaymentIntentId('pi_test_secret_intent');
        $refunded->markPaid(new \DateTimeImmutable('2026-11-02 10:01:00'));
        $refunded->revoke(Purchase::STATUS_REFUNDED, new \DateTimeImmutable('2026-11-05 09:00:00'));
        $purchases->method('findByUserForExport')->willReturn([$refunded]);

        $account = $this->report($users, purchases: $purchases, activeCount: 7)->account($this->admin(), 'ADA@example.test');

        self::assertSame([
            'email' => 'ada@example.test',
            'createdAt' => null,
            'emailVerifiedAt' => '2026-11-01T08:00:00+00:00',
            'unlockedAt' => null,
            'admin' => false,
            'paidFeatures' => false,
            'activeSubscriptions' => 7,
            'remindersEnabled' => true,
            'timezone' => 'Europe/Berlin',
            'remindersProcessedOn' => null,
            'purchases' => [[
                'status' => 'refunded',
                'amountInCents' => 1999,
                'currency' => 'EUR',
                'createdAt' => '2026-11-02T10:00:00+00:00',
                'paidAt' => '2026-11-02T10:01:00+00:00',
                'revokedAt' => '2026-11-05T09:00:00+00:00',
            ]],
        ], $account);
        $json = json_encode($account, \JSON_THROW_ON_ERROR);
        foreach (['hashed-password', 'cs_test_secret_session', 'pi_test_secret_intent', 'tokenVersion', 'roles'] as $secret) {
            self::assertStringNotContainsString($secret, $json);
        }
        // Logged by ID only: no email in the log.
        self::assertSame([['Admin looked up an account.', ['admin_user_id' => 1, 'user_id' => 42]]], $this->logged);
    }

    public function testALookupOfAnUnknownEmailReturnsNothingAndLogsNoEmail(): void
    {
        $users = $this->createStub(UserRepository::class);
        $users->method('findOneByEmail')->willReturn(null);

        self::assertNull($this->report($users)->account($this->admin(), 'nobody@example.test'));
        self::assertSame([['Admin looked up an email with no account.', ['admin_user_id' => 1]]], $this->logged);
    }

    private function report(
        UserRepository $users,
        ?SubscriptionRepository $subscriptions = null,
        ?PurchaseRepository $purchases = null,
        ?ReminderLogRepository $reminderLogs = null,
        int $activeCount = 0,
    ): OperatorReport {
        $subscriptions ??= $this->createStub(SubscriptionRepository::class);
        $subscriptions->method('countWithStatuses')->willReturn($activeCount);
        $logged = &$this->logged;
        $logger = new class($logged) extends AbstractLogger {
            /** @param list<array{string, array<string, mixed>}> $logged */
            public function __construct(private array &$logged)
            {
            }

            public function log($level, \Stringable|string $message, array $context = []): void
            {
                $this->logged[] = [(string) $message, $context];
            }
        };

        return new OperatorReport(
            $users,
            $subscriptions,
            $purchases ?? $this->createStub(PurchaseRepository::class),
            $reminderLogs ?? $this->createStub(ReminderLogRepository::class),
            new FreePlanLimit($this->createStub(EntityManagerInterface::class), $subscriptions),
            new class implements Clock {
                public function now(): \DateTimeImmutable
                {
                    return new \DateTimeImmutable(OperatorReportTest::NOW);
                }
            },
            $logger,
        );
    }

    private function admin(): User
    {
        $admin = (new User())->setEmail('operator@example.test')->setRoles([User::ROLE_ADMIN]);
        $this->setId($admin, 1);

        return $admin;
    }

    private function setId(User $user, int $id): void
    {
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, $id);
    }
}
