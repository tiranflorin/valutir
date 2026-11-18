<?php

declare(strict_types=1);

namespace App\Reminder;

use App\Entity\Subscription;

/**
 * How many days before a charge the reminder goes out: a default per cadence (and for trials), or the
 * subscription's own choice when the owner has paid features. Mirrored in frontend/src/utils/reminders.ts.
 */
final class ReminderPolicy
{
    public const int TRIAL_LEAD_DAYS = 2;

    public const int MIN_CUSTOM_LEAD_DAYS = 1;
    public const int MAX_CUSTOM_LEAD_DAYS = 30;

    public static function renewalLeadDays(string $cadence): int
    {
        return match ($cadence) {
            'weekly' => 1,
            'monthly' => 3,
            default => 7, // quarterly, yearly
        };
    }

    /**
     * @param bool $customTiming whether the owner has paid features; without them a stored choice is
     *                           kept but not used (for example after a refund), and the default applies
     */
    public static function leadDays(Subscription $subscription, bool $customTiming): int
    {
        $chosen = $subscription->getReminderLeadDays();
        if ($customTiming && null !== $chosen) {
            return $chosen;
        }

        return 'trial' === $subscription->getStatus()
            ? self::TRIAL_LEAD_DAYS
            : self::renewalLeadDays((string) $subscription->getBillingCadence());
    }
}
