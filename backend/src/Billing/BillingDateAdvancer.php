<?php

declare(strict_types=1);

namespace App\Billing;

use App\Entity\Subscription;

/**
 * Keeps stored billing data current once dates pass:
 *  - a trial whose end date has passed (and that still auto-renews) becomes active;
 *  - a next billing date in the past moves to the next charge on or after today.
 * Cancelled, "other", deleted, and non-renewing subscriptions are left alone.
 */
final readonly class BillingDateAdvancer
{
    public function __construct(private BillingSchedule $schedule)
    {
    }

    /**
     * Applies the changes to $subscription and describes them (empty when nothing changed).
     *
     * @param \DateTimeImmutable $today the owner's local calendar day (see UserTime::today())
     *
     * @return list<string>
     */
    public function advance(Subscription $subscription, \DateTimeImmutable $today): array
    {
        $status = $subscription->getStatus();
        if (null !== $subscription->getDeletedAt()
            || !\in_array($status, ['active', 'trial'], true)
            || false === $subscription->isAutoRenew()
        ) {
            return [];
        }

        $changes = [];
        $next = $subscription->getNextBillingDate();

        if ('trial' === $status) {
            $trialEnd = $subscription->getTrialEndsAt() ?? $next;
            if (null !== $trialEnd && CalendarDay::of($trialEnd) < $today) {
                // The user didn't cancel before the trial ended, so it renewed.
                $subscription->setStatus('active');
                $changes[] = sprintf('trial ended %s, now active', $trialEnd->format('Y-m-d'));
            }
        }

        $cadence = (string) $subscription->getBillingCadence();
        if (null !== $next && CalendarDay::of($next) < $today && \in_array($cadence, BillingSchedule::CADENCES, true)) {
            $advanced = $this->schedule->nextChargeOnOrAfter($next, $cadence, $today);
            $subscription->setNextBillingDate($advanced);
            $changes[] = sprintf('next billing date %s -> %s', $next->format('Y-m-d'), $advanced->format('Y-m-d'));
        }

        return $changes;
    }
}
