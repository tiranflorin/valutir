<?php

declare(strict_types=1);

namespace App\Reminder;

use App\Billing\BillingSchedule;
use App\Billing\CalendarDay;
use App\Entity\ReminderLog;
use App\Entity\Subscription;
use App\Repository\ReminderLogRepository;

/**
 * Decides which upcoming charges need a reminder today. Pure: no database, no clock.
 *
 * A charge is due once its reminder window opens (lead days before the charge) and until the
 * charge day itself, so a missed run catches up; the reminder log makes sure it's sent once.
 */
final readonly class ReminderPlanner
{
    public function __construct(private BillingSchedule $schedule)
    {
    }

    /**
     * @param Subscription[]      $subscriptions billable subscriptions of one user
     * @param \DateTimeImmutable  $today         the user's local calendar day
     * @param array<string, true> $alreadySent   keys from ReminderLogRepository::findSentKeys()
     * @param bool                $customTiming  the owner has paid features: each subscription's own lead time applies
     *
     * @return list<DueReminder> trials first, then by charge date
     */
    public function plan(array $subscriptions, \DateTimeImmutable $today, array $alreadySent, bool $customTiming = false): array
    {
        $due = [];
        foreach ($subscriptions as $subscription) {
            $reminder = $this->reminderFor($subscription, $today, $customTiming);
            if (null === $reminder) {
                continue;
            }
            $key = ReminderLogRepository::key((int) $subscription->getId(), $reminder->kind, $reminder->chargeDate);
            if (!isset($alreadySent[$key])) {
                $due[] = $reminder;
            }
        }

        usort($due, static fn (DueReminder $a, DueReminder $b): int => [ReminderLog::KIND_TRIAL_ENDING !== $a->kind, $a->chargeDate, $a->subscription->getServiceName()]
            <=> [ReminderLog::KIND_TRIAL_ENDING !== $b->kind, $b->chargeDate, $b->subscription->getServiceName()]);

        return $due;
    }

    private function reminderFor(Subscription $subscription, \DateTimeImmutable $today, bool $customTiming): ?DueReminder
    {
        $status = $subscription->getStatus();
        $cadence = (string) $subscription->getBillingCadence();
        if (null !== $subscription->getDeletedAt()
            || false === $subscription->isAutoRenew()
            || !\in_array($status, ['active', 'trial'], true)
            || !\in_array($cadence, BillingSchedule::CADENCES, true)
        ) {
            return null;
        }

        if ('trial' === $status) {
            $trialEnd = $subscription->getTrialEndsAt() ?? $subscription->getNextBillingDate();
            if (null === $trialEnd) {
                return null;
            }

            return $this->ifInWindow($subscription, ReminderLog::KIND_TRIAL_ENDING, CalendarDay::of($trialEnd), $today, ReminderPolicy::leadDays($subscription, $customTiming));
        }

        $next = $subscription->getNextBillingDate();
        if (null === $next) {
            return null;
        }
        $charge = $this->schedule->nextChargeOnOrAfter($next, $cadence, $today);

        return $this->ifInWindow($subscription, ReminderLog::KIND_RENEWAL, $charge, $today, ReminderPolicy::leadDays($subscription, $customTiming));
    }

    private function ifInWindow(Subscription $subscription, string $kind, \DateTimeImmutable $charge, \DateTimeImmutable $today, int $leadDays): ?DueReminder
    {
        if ($charge < $today) {
            return null;
        }
        $daysUntil = (int) $today->diff($charge)->days;

        return $daysUntil <= $leadDays ? new DueReminder($subscription, $kind, $charge, $daysUntil) : null;
    }
}
