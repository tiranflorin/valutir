<?php

declare(strict_types=1);

namespace App\Business;

use App\Billing\BillingSchedule;
use App\Billing\CalendarDay;
use App\Billing\UserTime;
use App\Clock\Clock;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\InvoiceFilingRepository;
use App\Repository\SubscriptionRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The charges of the owner's business subscriptions in a period, for the invoice checklist and the
 * accountant export. Estimates: they are counted from each subscription's billing date the same way
 * as the dashboard's month card (frontend/src/utils/monthCharges.ts), and priced from its history.
 *
 * Charges before the stored billing date are counted backwards, but only ones that have gone out,
 * never before the subscription started (or, without a start date, before it was added), and never
 * for a trial. A cancelled subscription keeps the charges up to its cancellation date; a paused one
 * shows none, since the pause date isn't known. Deleted subscriptions are left out.
 */
final readonly class BusinessCharges
{
    /** How far back the checklist and the export reach. */
    public const int MAX_MONTHS_BACK = 36;

    public const string MONTH_ERROR = 'Months are written YYYY-MM and go back at most 36 months from this one.';

    public function __construct(
        private SubscriptionRepository $subscriptionRepository,
        private InvoiceFilingRepository $invoiceFilingRepository,
        private BillingSchedule $schedule,
        private Clock $clock,
    ) {
    }

    /**
     * The charges from the first day of $firstMonth to the last day of $lastMonth, by date then service name.
     *
     * @return list<BusinessCharge>
     */
    public function between(User $user, \DateTimeImmutable $firstMonth, \DateTimeImmutable $lastMonth): array
    {
        $from = CalendarDay::fromString($firstMonth->format('Y-m-01'));
        $to = CalendarDay::fromString($lastMonth->format('Y-m-t'));
        $today = UserTime::today($user, $this->clock->now());
        $subscriptions = array_values(array_filter(
            $this->subscriptionRepository->findByUser($user),
            static fn (Subscription $subscription): bool => $subscription->isB2b(),
        ));
        $filed = $this->invoiceFilingRepository->findFiledKeys($subscriptions, $from, $to);

        $charges = [];
        foreach ($subscriptions as $subscription) {
            foreach ($this->chargeDates($subscription, $user, $from, $to, $today) as $date) {
                $terms = $subscription->priceTermsOn($date);
                $charges[] = new BusinessCharge(
                    $subscription,
                    $date,
                    $terms->amount,
                    $terms->currency,
                    $date > $today,
                    isset($filed[InvoiceFilingRepository::key((int) $subscription->getId(), $date)]),
                );
            }
        }

        usort($charges, static fn (BusinessCharge $a, BusinessCharge $b): int => ($a->date <=> $b->date)
            ?: strcasecmp((string) $a->subscription->getServiceName(), (string) $b->subscription->getServiceName()));

        return $charges;
    }

    /**
     * The owner's business subscription, if $date is one of its charges that has gone out (only those
     * can have an invoice). Otherwise a 404.
     */
    public function pastCharge(User $user, int $subscriptionId, string $date): Subscription
    {
        $day = self::parseDay($date);
        $subscription = $this->subscriptionRepository->findOneByIdAndUser($subscriptionId, $user);
        $today = UserTime::today($user, $this->clock->now());
        if (null === $day || null === $subscription || !$subscription->isB2b() || $day > $today
            || !\in_array($day, $this->chargeDates($subscription, $user, $day, $day, $today), false)) {
            throw new NotFoundHttpException('No such business charge.');
        }

        return $subscription;
    }

    /**
     * The first day of a "YYYY-MM" month the checklist and export may show: from MAX_MONTHS_BACK months
     * ago up to the owner's current month. Null otherwise.
     */
    public function month(User $user, string $value): ?\DateTimeImmutable
    {
        if (1 !== preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $value)) {
            return null;
        }
        $month = CalendarDay::fromString($value.'-01');
        $current = CalendarDay::fromString(UserTime::today($user, $this->clock->now())->format('Y-m-01'));

        return $month <= $current && $month >= $current->modify(sprintf('-%d months', self::MAX_MONTHS_BACK)) ? $month : null;
    }

    public function currentMonth(User $user): \DateTimeImmutable
    {
        return CalendarDay::fromString(UserTime::today($user, $this->clock->now())->format('Y-m-01'));
    }

    /**
     * @return list<\DateTimeImmutable>
     */
    private function chargeDates(Subscription $subscription, User $user, \DateTimeImmutable $from, \DateTimeImmutable $to, \DateTimeImmutable $today): array
    {
        $status = $subscription->getStatus();
        $cadence = (string) $subscription->getBillingCadence();
        $anchor = $subscription->getNextBillingDate();
        if (null === $anchor || Subscription::STATUS_PAUSED === $status || !\in_array($cadence, BillingSchedule::CADENCES, true)) {
            return [];
        }
        $anchor = CalendarDay::of($anchor);
        $cancelled = Subscription::STATUS_CANCELLED === $status;
        $startedAt = $subscription->getStartedAt();
        $earliest = null !== $startedAt
            ? CalendarDay::of($startedAt)
            : CalendarDay::fromString(UserTime::localNow($user, $subscription->getCreatedAt() ?? $this->clock->now())->format('Y-m-d'));

        $dates = [];
        // Forwards from the stored date. A cancelled subscription's stored date is when access ends, not a charge.
        if (!$cancelled) {
            for ($n = 0; ($date = $this->schedule->charge($anchor, $cadence, $n)) <= $to; ++$n) {
                if ($date >= $from) {
                    $dates[] = $date;
                }
            }
        }
        if ('trial' === $status) {
            return $dates;
        }

        // Backwards: charges that have gone out (today's included: the hourly command may already have moved the date past it).
        $latest = $cancelled && null !== $subscription->getCancelledAt() ? min($today, CalendarDay::of($subscription->getCancelledAt())) : $today;
        for ($n = -1; ($date = $this->schedule->charge($anchor, $cadence, $n)) >= $from && $date >= $earliest; --$n) {
            if ($date <= $to && $date <= $latest) {
                $dates[] = $date;
            }
        }

        return $dates;
    }

    private static function parseDay(string $value): ?\DateTimeImmutable
    {
        if (1 !== preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }
        $day = \DateTimeImmutable::createFromFormat('!Y-m-d', $value, new \DateTimeZone('UTC'));

        return false !== $day && $day->format('Y-m-d') === $value ? $day : null;
    }
}
