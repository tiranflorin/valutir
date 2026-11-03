<?php

declare(strict_types=1);

namespace App\Reminder;

/**
 * How many days before a charge the reminder goes out. Fixed for now; custom lead times are a
 * candidate paid-plan feature (see README "Product ideas").
 */
final class ReminderPolicy
{
    public const int TRIAL_LEAD_DAYS = 2;

    public static function renewalLeadDays(string $cadence): int
    {
        return match ($cadence) {
            'weekly' => 1,
            'monthly' => 3,
            default => 7, // quarterly, yearly
        };
    }
}
