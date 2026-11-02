<?php

declare(strict_types=1);

namespace App\Tests\Billing;

use App\Billing\BillingDateAdvancer;
use App\Billing\BillingSchedule;
use App\Billing\CalendarDay;
use App\Entity\Subscription;
use PHPUnit\Framework\TestCase;

final class BillingDateAdvancerTest extends TestCase
{
    private const string TODAY = '2026-11-02';

    public function testPastNextBillingDateMovesToTheNextChargeOnOrAfterToday(): void
    {
        $subscription = $this->subscription('active', '2026-07-21', 'monthly');

        $changes = $this->advance($subscription);

        self::assertSame('2026-11-21', $subscription->getNextBillingDate()?->format('Y-m-d'));
        self::assertSame(['next billing date 2026-07-21 -> 2026-11-21'], $changes);
    }

    public function testCurrentDatesAreLeftAlone(): void
    {
        foreach (['2026-11-02', '2026-11-30'] as $date) {
            $subscription = $this->subscription('active', $date, 'monthly');

            self::assertSame([], $this->advance($subscription));
            self::assertSame($date, $subscription->getNextBillingDate()?->format('Y-m-d'));
        }
    }

    public function testEndedTrialBecomesActiveAndMovesToItsNextCharge(): void
    {
        $subscription = $this->subscription('trial', '2026-10-20', 'monthly');
        $subscription->setTrialEndsAt(CalendarDay::fromString('2026-10-20'));

        $changes = $this->advance($subscription);

        self::assertSame('active', $subscription->getStatus());
        self::assertSame('2026-11-20', $subscription->getNextBillingDate()?->format('Y-m-d'));
        self::assertCount(2, $changes);
    }

    public function testTrialEndingTodayIsStillATrial(): void
    {
        $subscription = $this->subscription('trial', self::TODAY, 'monthly');
        $subscription->setTrialEndsAt(CalendarDay::fromString(self::TODAY));

        self::assertSame([], $this->advance($subscription));
        self::assertSame('trial', $subscription->getStatus());
    }

    public function testCancelledNonRenewingAndDeletedSubscriptionsAreNotTouched(): void
    {
        $cancelled = $this->subscription('cancelled', '2026-07-21', 'monthly');
        $notRenewing = $this->subscription('active', '2026-07-21', 'monthly');
        $notRenewing->setAutoRenew(false);
        $deleted = $this->subscription('active', '2026-07-21', 'monthly');
        $deleted->setDeletedAt(new \DateTimeImmutable());
        $endedTrialNotRenewing = $this->subscription('trial', '2026-10-20', 'monthly');
        $endedTrialNotRenewing->setAutoRenew(false);

        foreach ([$cancelled, $notRenewing, $deleted, $endedTrialNotRenewing] as $subscription) {
            self::assertSame([], $this->advance($subscription));
            self::assertSame('2026', $subscription->getNextBillingDate()?->format('Y'));
        }
        self::assertSame('2026-07-21', $notRenewing->getNextBillingDate()?->format('Y-m-d'));
        self::assertSame('trial', $endedTrialNotRenewing->getStatus());
    }

    /**
     * @return list<string>
     */
    private function advance(Subscription $subscription): array
    {
        return (new BillingDateAdvancer(new BillingSchedule()))->advance($subscription, CalendarDay::fromString(self::TODAY));
    }

    private function subscription(string $status, string $nextBillingDate, string $cadence): Subscription
    {
        $subscription = new Subscription();
        $subscription->setStatus($status);
        $subscription->setBillingCadence($cadence);
        $subscription->setNextBillingDate(CalendarDay::fromString($nextBillingDate));

        return $subscription;
    }
}
