<?php

declare(strict_types=1);

namespace App\Billing;

/**
 * Charge dates of a recurring subscription, counted from its anchor date.
 *
 * Charge N is computed from the anchor (not from the previous charge), and month-based cadences
 * clamp to the end of shorter months: 31 Jan -> 28 Feb -> 31 Mar. The frontend calendar
 * (utils/buildRecurringOccurrences.ts) follows the same rule.
 */
final class BillingSchedule
{
    public const array CADENCES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

    /**
     * The first charge on or after $day. Days are midnight-UTC calendar days (see CalendarDay).
     */
    public function nextChargeOnOrAfter(\DateTimeImmutable $anchor, string $cadence, \DateTimeImmutable $day): \DateTimeImmutable
    {
        $anchor = CalendarDay::of($anchor);
        $day = CalendarDay::of($day);
        if ($anchor >= $day) {
            return $anchor;
        }

        // Jump close to $day first, so long gaps don't need thousands of steps.
        $n = $this->estimateChargesBetween($anchor, $cadence, $day);
        while ($n > 0 && $this->charge($anchor, $cadence, $n - 1) >= $day) {
            --$n;
        }
        while ($this->charge($anchor, $cadence, $n) < $day) {
            ++$n;
        }

        return $this->charge($anchor, $cadence, $n);
    }

    /** Charge number $n (0 = the anchor itself). */
    public function charge(\DateTimeImmutable $anchor, string $cadence, int $n): \DateTimeImmutable
    {
        return match ($cadence) {
            'daily' => $anchor->modify(sprintf('+%d days', $n)),
            'weekly' => $anchor->modify(sprintf('+%d days', 7 * $n)),
            'monthly' => $this->addMonthsClamped($anchor, $n),
            'quarterly' => $this->addMonthsClamped($anchor, 3 * $n),
            'yearly' => $this->addMonthsClamped($anchor, 12 * $n),
            default => throw new \InvalidArgumentException(sprintf('Unknown billing cadence "%s".', $cadence)),
        };
    }

    private function addMonthsClamped(\DateTimeImmutable $anchor, int $months): \DateTimeImmutable
    {
        $monthIndex = (int) $anchor->format('Y') * 12 + (int) $anchor->format('n') - 1 + $months;
        $year = intdiv($monthIndex, 12);
        $month = $monthIndex % 12 + 1;
        $firstOfMonth = $anchor->setDate($year, $month, 1);
        $day = min((int) $anchor->format('j'), (int) $firstOfMonth->format('t'));

        return $anchor->setDate($year, $month, $day);
    }

    private function estimateChargesBetween(\DateTimeImmutable $anchor, string $cadence, \DateTimeImmutable $day): int
    {
        $days = (int) $anchor->diff($day)->days;

        return match ($cadence) {
            'daily' => $days,
            'weekly' => intdiv($days, 7),
            'monthly' => intdiv($days, 31),
            'quarterly' => intdiv($days, 92),
            'yearly' => intdiv($days, 366),
            default => 0,
        };
    }
}
