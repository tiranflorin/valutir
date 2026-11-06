<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Clock\Clock;
use App\Entity\Purchase;
use App\Entity\ReminderLog;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\EmailChangeRequestRepository;
use App\Repository\PurchaseRepository;
use App\Repository\ReminderLogRepository;
use App\Repository\SubscriptionRepository;
use App\Service\AccountExportService;
use App\Service\AccountMailer;
use App\Service\AccountService;
use App\Tests\Support\Emails;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AccountExportServiceTest extends TestCase
{
    private const string NOW = '2026-11-06T10:00:00+00:00';
    private const string PASSWORD_HASH = '$2y$13$secret-password-hash-value';
    private const string VERIFICATION_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    private const string STRIPE_SESSION = 'cs_test_made_up_session_id';

    private User $user;

    protected function setUp(): void
    {
        $this->user = (new User())->setEmail('ada@example.test')->setName('Ada')->setPassword(self::PASSWORD_HASH);
        (new \ReflectionProperty(User::class, 'id'))->setValue($this->user, 7);
        $this->user->setEmailVerificationToken(self::VERIFICATION_HASH, new \DateTimeImmutable('+1 day'));
        $this->user->unlock(new \DateTimeImmutable('2026-10-01T09:00:00+00:00'));
    }

    public function testJsonHoldsTheAccountDeletedSubscriptionsPurchasesAndReminders(): void
    {
        $netflix = $this->subscription(1, 'Netflix', '13.99');
        $old = $this->subscription(2, 'Old Hosting', '5.00')
            ->setDeletedAt(new \DateTimeImmutable('2026-09-01T12:00:00+00:00'))
            ->setDeletedUseful(true);
        $purchase = new Purchase($this->user, 'unlock', self::STRIPE_SESSION, 1999, 'EUR', new \DateTimeImmutable('2026-10-01T08:59:00+00:00'));
        $reminder = new ReminderLog($netflix, 'renewal', new \DateTimeImmutable('2026-11-20'), new \DateTimeImmutable('2026-11-17T07:00:00+00:00'));

        $export = $this->service(subscriptions: [$netflix, $old], purchases: [$purchase], reminders: [$reminder])->export($this->user);

        self::assertSame('valutir-account-export', $export['format']);
        self::assertSame(self::NOW, $export['exportedAt']);
        self::assertSame('ada@example.test', $export['account']['email']);
        self::assertSame('2026-10-01T09:00:00+00:00', $export['account']['unlockedAt']);
        self::assertSame(['Netflix', 'Old Hosting'], array_column($export['subscriptions'], 'serviceName'));
        self::assertNull($export['subscriptions'][0]['deletedAt']);
        self::assertNull($export['subscriptions'][0]['deletedUseful']);
        self::assertSame('2026-09-01T12:00:00+00:00', $export['subscriptions'][1]['deletedAt']);
        self::assertTrue($export['subscriptions'][1]['deletedUseful']);
        self::assertSame([[
            'product' => 'unlock',
            'amount' => '19.99',
            'currency' => 'EUR',
            'status' => 'pending',
            'createdAt' => '2026-10-01T08:59:00+00:00',
            'paidAt' => null,
            'revokedAt' => null,
        ]], $export['purchases']);
        self::assertSame([[
            'subscriptionId' => 1,
            'kind' => 'renewal',
            'chargeDate' => '2026-11-20',
            'sentAt' => '2026-11-17T07:00:00+00:00',
        ]], $export['reminders']);
    }

    public function testJsonNeverContainsSecretsOrStripeReferences(): void
    {
        $purchase = new Purchase($this->user, 'unlock', self::STRIPE_SESSION, 1999, 'EUR', new \DateTimeImmutable());
        $json = json_encode($this->service(subscriptions: [$this->subscription(1, 'Netflix', '9.99')], purchases: [$purchase])->export($this->user), \JSON_THROW_ON_ERROR);

        self::assertStringNotContainsString(self::PASSWORD_HASH, $json);
        self::assertStringNotContainsString(self::VERIFICATION_HASH, $json);
        self::assertStringNotContainsString(self::STRIPE_SESSION, $json);
        foreach (['password', 'tokenVersion', 'TokenHash', 'stripe'] as $field) {
            self::assertStringNotContainsStringIgnoringCase('"'.$field, $json, $field);
        }
    }

    public function testCsvListsSubscriptionsByNameWithTheSharedPart(): void
    {
        $rows = iterator_to_array($this->service(subscriptions: [
            $this->subscription(1, 'spotify', '10.99'),
            $this->subscription(2, 'Netflix', '13.99')->setHouseholdSharing(4)->setNotes('Family plan'),
        ])->subscriptionRows($this->user), false);

        self::assertSame(AccountExportService::CSV_COLUMNS, $rows[0]);
        self::assertSame(['Netflix', 'Streaming', '13.99', 'EUR', 'monthly', '2026-11-20', 'active', 'no', 'yes', '4', '3.50', '', 'Family plan', '2026-01-01', '', ''], $rows[1]);
        self::assertSame('spotify', $rows[2][0]);
        self::assertSame(['no', '', '10.99'], [$rows[2][8], $rows[2][9], $rows[2][10]]);
    }

    public function testCsvCanBeLimitedToBusinessOrPersonal(): void
    {
        $service = $this->service(subscriptions: [
            $this->subscription(1, 'Figma', '15.00')->setB2b(true),
            $this->subscription(2, 'Netflix', '13.99'),
        ]);

        self::assertSame(['Figma'], array_column(\array_slice(iterator_to_array($service->subscriptionRows($this->user, true), false), 1), 0));
        self::assertSame(['Netflix'], array_column(\array_slice(iterator_to_array($service->subscriptionRows($this->user, false), false), 1), 0));
    }

    public function testCsvCellsCannotRunAsSpreadsheetFormulas(): void
    {
        $rows = iterator_to_array($this->service(subscriptions: [
            $this->subscription(1, '=HYPERLINK("https://evil.example","x")', '9.99')->setNotes('@SUM(A1)'),
        ])->subscriptionRows($this->user), false);

        self::assertSame('\'=HYPERLINK("https://evil.example","x")', $rows[1][0]);
        self::assertSame("'@SUM(A1)", $rows[1][12]);
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function cells(): iterable
    {
        yield 'formula' => ['=1+1', "'=1+1"];
        yield 'plus' => ['+cmd', "'+cmd"];
        yield 'minus text' => ['-cmd', "'-cmd"];
        yield 'at' => ['@SUM(A1)', "'@SUM(A1)"];
        yield 'tab' => ["\t=1", "'\t=1"];
        yield 'carriage return' => ["\r=1", "'\r=1"];
        yield 'negative number' => ['-5.00', '-5.00'];
        yield 'plain text' => ['Netflix', 'Netflix'];
        yield 'empty' => ['', ''];
    }

    #[DataProvider('cells')]
    public function testSafeCell(string $value, string $expected): void
    {
        self::assertSame($expected, AccountExportService::safeCell($value));
    }

    private function subscription(int $id, string $name, string $amount): Subscription
    {
        $subscription = (new Subscription())
            ->setUser($this->user)
            ->setServiceName($name)
            ->setAmount($amount)
            ->setCurrency('EUR')
            ->setBillingCadence('monthly')
            ->setCategory('Streaming')
            ->setStartedAt(new \DateTimeImmutable('2026-01-01'))
            ->setNextBillingDate(new \DateTimeImmutable('2026-11-20'));
        $subscription->setStatus('active');
        (new \ReflectionProperty(Subscription::class, 'id'))->setValue($subscription, $id);

        return $subscription;
    }

    /**
     * @param Subscription[] $subscriptions
     * @param Purchase[]     $purchases
     * @param ReminderLog[]  $reminders
     */
    private function service(array $subscriptions = [], array $purchases = [], array $reminders = []): AccountExportService
    {
        $subscriptionRepository = $this->createStub(SubscriptionRepository::class);
        $subscriptionRepository->method('findAllForExport')->willReturn($subscriptions);
        $subscriptionRepository->method('findByUser')->willReturn(array_values(array_filter(
            $subscriptions,
            static fn (Subscription $subscription): bool => null === $subscription->getDeletedAt(),
        )));
        $purchaseRepository = $this->createStub(PurchaseRepository::class);
        $purchaseRepository->method('findByUserForExport')->willReturn($purchases);
        $reminderLogRepository = $this->createStub(ReminderLogRepository::class);
        $reminderLogRepository->method('findByUserForExport')->willReturn($reminders);
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable(self::NOW));

        $accountService = new AccountService(
            $this->createStub(EntityManagerInterface::class),
            $this->createStub(EmailChangeRequestRepository::class),
            $this->createStub(UserPasswordHasherInterface::class),
            new AccountMailer($this->createStub(MailerInterface::class), Emails::factory(), new NullLogger()),
            new NullLogger(),
        );

        return new AccountExportService($accountService, $subscriptionRepository, $purchaseRepository, $reminderLogRepository, $clock);
    }
}
