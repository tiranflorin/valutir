<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\PriceChange;
use App\Entity\PriceTerms;
use App\Entity\Subscription;
use PHPUnit\Framework\TestCase;

final class SubscriptionPriceHistoryTest extends TestCase
{
    private const string ADDED = '2026-10-01';

    public function testAChangedAmountKeepsTheOldPrice(): void
    {
        $subscription = $this->subscription('11.99');

        $subscription->recordPriceChange($this->terms('13.99'), $this->day('2026-11-15'), $this->day(self::ADDED));

        self::assertSame([[
            'id' => null,
            'previousAmount' => '11.99',
            'previousCurrency' => 'EUR',
            'previousCadence' => 'monthly',
            'newAmount' => '13.99',
            'newCurrency' => 'EUR',
            'newCadence' => 'monthly',
            'changedOn' => '2026-11-15',
        ]], $subscription->toArray()['priceChanges']);
    }

    public function testACadenceOrCurrencyChangeIsAPriceChangeToo(): void
    {
        $subscription = $this->subscription('9.99');

        $subscription->recordPriceChange(new PriceTerms('99.99', 'EUR', 'yearly'), $this->day('2026-11-15'), $this->day(self::ADDED));
        $subscription->setBillingCadence('yearly');
        $subscription->setAmount('99.99');
        $subscription->recordPriceChange(new PriceTerms('99.99', 'USD', 'yearly'), $this->day('2026-12-01'), $this->day(self::ADDED));

        self::assertCount(2, $subscription->getPriceChanges());
    }

    public function testAnEditThatKeepsThePriceRecordsNothing(): void
    {
        $subscription = $this->subscription('11.99');

        $subscription->recordPriceChange($this->terms('11.99'), $this->day('2026-11-15'), $this->day(self::ADDED));

        self::assertSame([], $subscription->getPriceChanges());
    }

    public function testEditsOnTheDayItWasAddedAreSetUpNotChanges(): void
    {
        $subscription = $this->subscription('11.99');

        $subscription->recordPriceChange($this->terms('1.99'), $this->day(self::ADDED), $this->day(self::ADDED));

        self::assertSame([], $subscription->getPriceChanges());
    }

    public function testASecondEditOnTheSameDayReplacesTheFirstAndUndoingItLeavesNothing(): void
    {
        $subscription = $this->subscription('11.99');
        $today = $this->day('2026-11-15');

        $subscription->recordPriceChange($this->terms('139.9'), $today, $this->day(self::ADDED));
        $subscription->setAmount('139.9');
        $subscription->recordPriceChange($this->terms('13.99'), $today, $this->day(self::ADDED));
        self::assertCount(1, $subscription->getPriceChanges());
        self::assertSame('11.99', $subscription->getPriceChanges()[0]->previous()->amount);
        self::assertSame('13.99', $subscription->getPriceChanges()[0]->new()->amount);

        $subscription->setAmount('13.99');
        $subscription->recordPriceChange($this->terms('11.99'), $today, $this->day(self::ADDED));
        self::assertSame([], $subscription->getPriceChanges());
    }

    public function testChangesAreListedNewestFirst(): void
    {
        $subscription = $this->subscription('10.00');
        $subscription->recordPriceChange($this->terms('11.00'), $this->day('2026-11-01'), $this->day(self::ADDED));
        $subscription->setAmount('11.00');
        $subscription->recordPriceChange($this->terms('12.00'), $this->day('2027-02-01'), $this->day(self::ADDED));

        self::assertSame(['2027-02-01', '2026-11-01'], array_map(
            static fn (PriceChange $change): string => $change->getChangedOn()->format('Y-m-d'),
            $subscription->getPriceChanges(),
        ));
    }

    public function testRemovingAnUnknownChangeReportsIt(): void
    {
        self::assertFalse($this->subscription('10.00')->removePriceChange(5));
    }

    private function subscription(string $amount): Subscription
    {
        $subscription = new Subscription();
        $subscription->setAmount($amount);
        $subscription->setCurrency('EUR');
        $subscription->setBillingCadence('monthly');

        return $subscription;
    }

    private function terms(string $amount): PriceTerms
    {
        return new PriceTerms($amount, 'EUR', 'monthly');
    }

    private function day(string $isoDate): \DateTimeImmutable
    {
        return new \DateTimeImmutable($isoDate);
    }
}
