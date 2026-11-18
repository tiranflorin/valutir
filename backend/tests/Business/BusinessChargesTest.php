<?php

declare(strict_types=1);

namespace App\Tests\Business;

use App\Billing\BillingSchedule;
use App\Business\AccountantExport;
use App\Business\BusinessCharge;
use App\Business\BusinessCharges;
use App\Clock\Clock;
use App\Entity\PriceTerms;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\InvoiceFilingRepository;
use App\Repository\SubscriptionRepository;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class BusinessChargesTest extends TestCase
{
    /** Wednesday 18 November 2026, 10:00 in Berlin (the default time zone). */
    private const string NOW = '2026-11-18T09:00:00+00:00';

    private User $user;

    /** @var Subscription[] */
    private array $subscriptions = [];

    /** @var array<string, true> */
    private array $filed = [];

    protected function setUp(): void
    {
        $this->user = (new User())->setEmail('ada@example.test');
    }

    public function testListsTheMonthsChargesOfBusinessSubscriptionsOnly(): void
    {
        $this->subscription(1, 'Figma', nextBilling: '2026-11-25');
        $this->subscription(2, 'Notion', nextBilling: '2026-12-03');
        $this->subscription(3, 'Netflix', nextBilling: '2026-11-20', b2b: false);

        self::assertSame([['Notion', '2026-11-03', false], ['Figma', '2026-11-25', true]], array_map(
            static fn (BusinessCharge $charge): array => [$charge->subscription->getServiceName(), $charge->date->format('Y-m-d'), $charge->upcoming],
            $this->charges('2026-11'),
        ));
    }

    public function testEarlierMonthsCountBackFromTheBillingDate(): void
    {
        $this->subscription(1, 'Figma', nextBilling: '2026-11-25', startedAt: '2026-09-01');

        self::assertSame(['2026-10-25'], $this->dates('2026-10'));
        self::assertSame(['2026-09-25'], $this->dates('2026-09'));
        self::assertSame([], $this->dates('2026-08'), 'nothing before the subscription started');
    }

    public function testWithoutAStartDateNothingIsCountedBeforeItWasAdded(): void
    {
        $this->subscription(1, 'Figma', nextBilling: '2026-11-25', createdAt: '2026-10-10T08:00:00+00:00');

        self::assertSame(['2026-10-25'], $this->dates('2026-10'));
        self::assertSame([], $this->dates('2026-09'));
    }

    public function testATrialHasNoPastChargesAndAPausedOneNone(): void
    {
        $this->subscription(1, 'Trial tool', nextBilling: '2026-11-28', status: 'trial', startedAt: '2026-01-01');
        $this->subscription(2, 'Paused tool', nextBilling: '2026-12-01', status: 'paused', startedAt: '2026-01-01');

        self::assertSame(['2026-11-28'], $this->dates('2026-11'));
        self::assertSame([], $this->dates('2026-10'));
    }

    public function testACancelledSubscriptionKeepsItsChargesUpToTheCancellation(): void
    {
        // Cancelled on 5 October; access ran to 25 October, which is not a charge.
        $this->subscription(1, 'Old CRM', nextBilling: '2026-10-25', status: 'cancelled', startedAt: '2026-01-01', cancelledAt: '2026-10-05');

        self::assertSame([], $this->dates('2026-11'));
        self::assertSame([], $this->dates('2026-10'));
        self::assertSame(['2026-09-25'], $this->dates('2026-09'));
    }

    public function testCountsEveryWeeklyCharge(): void
    {
        $this->subscription(1, 'Weekly', nextBilling: '2026-11-23', cadence: 'weekly', startedAt: '2026-01-01');

        self::assertSame(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'], $this->dates('2026-11'));
    }

    public function testATodayChargeHasGoneOut(): void
    {
        // The hourly command already moved the billing date past today's charge.
        $this->subscription(1, 'Figma', nextBilling: '2026-12-18', startedAt: '2026-01-01');

        $charges = $this->charges('2026-11');

        self::assertSame('2026-11-18', $charges[0]->date->format('Y-m-d'));
        self::assertFalse($charges[0]->upcoming);
    }

    public function testEachChargeHasThePriceOfItsDay(): void
    {
        $figma = $this->subscription(1, 'Figma', nextBilling: '2026-11-25', startedAt: '2026-01-01', amount: '12.00');
        $figma->recordPriceChange(new PriceTerms('15.00', 'EUR', 'monthly'), new \DateTimeImmutable('2026-11-01'), new \DateTimeImmutable('2026-01-01'));
        $figma->setAmount('15.00');

        self::assertSame('12.00', $this->charges('2026-10')[0]->amount);
        self::assertSame('15.00', $this->charges('2026-11')[0]->amount);
    }

    public function testMarksTheChargesWhoseInvoiceIsFiled(): void
    {
        $this->subscription(1, 'Figma', nextBilling: '2026-11-25', startedAt: '2026-01-01');
        $this->filed = [InvoiceFilingRepository::key(1, new \DateTimeImmutable('2026-10-25')) => true];

        self::assertTrue($this->charges('2026-10')[0]->invoiceFiled);
        self::assertFalse($this->charges('2026-09')[0]->invoiceFiled);
    }

    public function testOnlyAPastChargeOfABusinessSubscriptionCanBeFiled(): void
    {
        $figma = $this->subscription(1, 'Figma', nextBilling: '2026-11-25', startedAt: '2026-01-01');
        $this->subscription(2, 'Netflix', nextBilling: '2026-11-20', startedAt: '2026-01-01', b2b: false);

        self::assertSame($figma, $this->service()->pastCharge($this->user, 1, '2026-10-25'));

        foreach ([[1, '2026-11-25'], [1, '2026-10-24'], [1, '2026-02-30'], [1, '25-10-2026'], [2, '2026-10-20'], [9, '2026-10-25']] as [$id, $date]) {
            try {
                $this->service()->pastCharge($this->user, $id, $date);
                self::fail(sprintf('%d %s should not be a filable charge', $id, $date));
            } catch (NotFoundHttpException) {
                self::assertTrue(true);
            }
        }
    }

    /**
     * @return iterable<string, array{string, ?string}>
     */
    public static function months(): iterable
    {
        yield 'this month' => ['2026-11', '2026-11-01'];
        yield '36 months back' => ['2023-11', '2023-11-01'];
        yield 'next month' => ['2026-12', null];
        yield 'too far back' => ['2023-10', null];
        yield 'not a month' => ['2026-13', null];
        yield 'a day' => ['2026-11-01', null];
        yield 'empty' => ['', null];
    }

    #[DataProvider('months')]
    public function testMonthsGoBackThreeYearsAndNotIntoTheFuture(string $value, ?string $expected): void
    {
        self::assertSame($expected, $this->service()->month($this->user, $value)?->format('Y-m-d'));
    }

    public function testTheExportListsChargesThatHaveGoneOutAsSafeCells(): void
    {
        $this->subscription(1, '=Figma', nextBilling: '2026-11-25', startedAt: '2026-01-01', amount: '12.50', currency: 'RON')->setPaymentMethod('Company card');
        $this->filed = [InvoiceFilingRepository::key(1, new \DateTimeImmutable('2026-10-25')) => true];
        $export = new AccountantExport($this->service());

        $rows = iterator_to_array($export->rows($this->user, new \DateTimeImmutable('2026-10-01'), new \DateTimeImmutable('2026-11-01')), false);

        self::assertSame([
            AccountantExport::COLUMNS,
            ['2026-10-25', "'=Figma", 'Software', '12.50', 'RON', 'Company card', 'yes'],
        ], $rows, 'the November charge is still to come');
    }

    public function testTheExportNeedsTheUnlockAndAPeriodOfAtMostAYear(): void
    {
        $export = new AccountantExport($this->service());

        try {
            $export->period($this->user, '2026-10', '2026-10');
            self::fail('a free account got the export');
        } catch (AccessDeniedHttpException) {
            self::assertTrue(true);
        }

        $admin = (new User())->setEmail('admin@example.test')->setRoles([User::ROLE_ADMIN]);
        self::assertSame('2026-10', $export->period($admin, '2026-10', '2026-10')[0]->format('Y-m'), 'admins get it without paying');

        $this->user->unlock(new \DateTimeImmutable('2026-11-01'));
        [$first, $last] = $export->period($this->user, '2025-12', '2026-11');
        self::assertSame(['2025-12-01', '2026-11-01'], [$first->format('Y-m-d'), $last->format('Y-m-d')]);

        foreach ([['2025-11', '2026-11'], ['2026-11', '2026-10'], ['2026-10', null], ['2026-10', '2026-12']] as [$from, $to]) {
            try {
                $export->period($this->user, $from, $to);
                self::fail(sprintf('%s to %s should be refused', $from, $to ?? 'nothing'));
            } catch (BadRequestHttpException) {
                self::assertTrue(true);
            }
        }
    }

    public function testExportFileNamesSayThePeriod(): void
    {
        self::assertSame('valutir-business-charges-2026-10.csv', AccountantExport::filename(new \DateTimeImmutable('2026-10-01'), new \DateTimeImmutable('2026-10-01')));
        self::assertSame('valutir-business-charges-2026-10-to-2026-12.csv', AccountantExport::filename(new \DateTimeImmutable('2026-10-01'), new \DateTimeImmutable('2026-12-01')));
    }

    /**
     * @return list<BusinessCharge>
     */
    private function charges(string $month): array
    {
        $first = new \DateTimeImmutable($month.'-01');

        return $this->service()->between($this->user, $first, $first);
    }

    /**
     * @return list<string>
     */
    private function dates(string $month): array
    {
        return array_map(static fn (BusinessCharge $charge): string => $charge->date->format('Y-m-d'), $this->charges($month));
    }

    private function service(): BusinessCharges
    {
        $subscriptions = $this->createStub(SubscriptionRepository::class);
        $subscriptions->method('findByUser')->willReturn($this->subscriptions);
        $subscriptions->method('findOneByIdAndUser')->willReturnCallback(
            fn (int $id): ?Subscription => array_values(array_filter($this->subscriptions, static fn (Subscription $subscription): bool => $subscription->getId() === $id))[0] ?? null,
        );
        $filings = $this->createStub(InvoiceFilingRepository::class);
        $filings->method('findFiledKeys')->willReturnCallback(fn (): array => $this->filed);
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable(self::NOW));

        return new BusinessCharges($subscriptions, $filings, new BillingSchedule(), $clock);
    }

    private function subscription(
        int $id,
        string $name,
        string $nextBilling,
        string $status = 'active',
        string $cadence = 'monthly',
        ?string $startedAt = null,
        ?string $cancelledAt = null,
        string $createdAt = '2026-01-01T00:00:00+00:00',
        string $amount = '10.00',
        string $currency = 'EUR',
        bool $b2b = true,
    ): Subscription {
        $subscription = (new Subscription())
            ->setUser($this->user)
            ->setServiceName($name)
            ->setAmount($amount)
            ->setCurrency($currency)
            ->setBillingCadence($cadence)
            ->setCategory('Software')
            ->setB2b($b2b)
            ->setStartedAt(null === $startedAt ? null : new \DateTimeImmutable($startedAt))
            ->setCancelledAt(null === $cancelledAt ? null : new \DateTimeImmutable($cancelledAt))
            ->setNextBillingDate(new \DateTimeImmutable($nextBilling));
        $subscription->setStatus($status);
        (new \ReflectionProperty(Subscription::class, 'id'))->setValue($subscription, $id);
        (new \ReflectionProperty(Subscription::class, 'createdAt'))->setValue($subscription, new \DateTimeImmutable($createdAt));
        $this->subscriptions[] = $subscription;

        return $subscription;
    }
}
