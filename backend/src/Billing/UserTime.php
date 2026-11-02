<?php

declare(strict_types=1);

namespace App\Billing;

use App\Entity\User;

/**
 * A user's local time. Falls back to the default time zone if a stored value is not valid.
 */
final class UserTime
{
    public static function timezone(User $user): \DateTimeZone
    {
        try {
            return new \DateTimeZone($user->getTimezone());
        } catch (\Exception) {
            return new \DateTimeZone(User::DEFAULT_TIMEZONE);
        }
    }

    public static function localNow(User $user, \DateTimeImmutable $now): \DateTimeImmutable
    {
        return $now->setTimezone(self::timezone($user));
    }

    /** The user's local calendar day (midnight UTC, see CalendarDay). */
    public static function today(User $user, \DateTimeImmutable $now): \DateTimeImmutable
    {
        return CalendarDay::fromString(self::localNow($user, $now)->format('Y-m-d'));
    }
}
