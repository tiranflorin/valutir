<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Subscription;
use PHPUnit\Framework\TestCase;

final class SubscriptionPayerHistoryTest extends TestCase
{
    private const string ADDED = '2026-10-01';

    public function testOnlyABusinessSubscriptionCanBePaidPersonally(): void
    {
        self::assertFalse((new Subscription())->setB2b(false)->setPaidPersonally(true)->isPaidPersonally());
        self::assertTrue((new Subscription())->setB2b(true)->setPaidPersonally(true)->isPaidPersonally());
    }

    public function testEarlierChargesKeepTheCardTheyWerePaidWith(): void
    {
        // Paid with the owner's card until switching to the company card on 1 December.
        $subscription = $this->business(paidPersonally: true);
        $this->switchTo($subscription, false, '2026-12-01');

        self::assertTrue($subscription->paidPersonallyOn($this->day('2026-11-25')));
        self::assertFalse($subscription->paidPersonallyOn($this->day('2026-12-01')));
        self::assertFalse($subscription->paidPersonallyOn($this->day('2026-12-25')));
        self::assertSame([['previousPaidPersonally' => true, 'changedOn' => '2026-12-01']], $this->history($subscription));
    }

    public function testEachSwitchCountsFromItsOwnDay(): void
    {
        $subscription = $this->business(paidPersonally: false);
        $this->switchTo($subscription, true, '2026-11-10');
        $this->switchTo($subscription, false, '2026-12-10');

        self::assertFalse($subscription->paidPersonallyOn($this->day('2026-11-05')));
        self::assertTrue($subscription->paidPersonallyOn($this->day('2026-11-25')));
        self::assertFalse($subscription->paidPersonallyOn($this->day('2026-12-25')));
    }

    public function testSwitchingBackOnTheSameDayLeavesNoChange(): void
    {
        $subscription = $this->business(paidPersonally: false);
        $this->switchTo($subscription, true, '2026-11-10');
        $this->switchTo($subscription, false, '2026-11-10');

        self::assertSame([], $this->history($subscription));
    }

    public function testNoChangeOnTheDayItWasAddedOrWhenNothingChanged(): void
    {
        $subscription = $this->business(paidPersonally: false);
        $this->switchTo($subscription, true, self::ADDED);
        $this->switchTo($subscription, true, '2026-11-10');

        self::assertSame([], $this->history($subscription));
        self::assertTrue($subscription->paidPersonallyOn($this->day('2026-10-15')));
    }

    private function business(bool $paidPersonally): Subscription
    {
        return (new Subscription())->setB2b(true)->setPaidPersonally($paidPersonally);
    }

    /** What SubscriptionService::update() does: record first, then apply the edit. */
    private function switchTo(Subscription $subscription, bool $paidPersonally, string $day): void
    {
        $subscription->recordPayerChange($paidPersonally, $this->day($day), $this->day(self::ADDED));
        $subscription->setPaidPersonally($paidPersonally);
    }

    /**
     * @return list<array<string, bool|string>>
     */
    private function history(Subscription $subscription): array
    {
        return array_map(static fn ($change): array => $change->toArray(), $subscription->getPayerChanges());
    }

    private function day(string $isoDate): \DateTimeImmutable
    {
        return new \DateTimeImmutable($isoDate);
    }
}
