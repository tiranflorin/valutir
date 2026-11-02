<?php

declare(strict_types=1);

namespace App\Billing;

/**
 * Date-only values for billing: midnight UTC, so comparisons and arithmetic ignore time zones.
 */
final class CalendarDay
{
    public static function fromString(string $isoDate): \DateTimeImmutable
    {
        $day = \DateTimeImmutable::createFromFormat('!Y-m-d', $isoDate, new \DateTimeZone('UTC'));
        if (false === $day) {
            throw new \InvalidArgumentException(sprintf('Invalid calendar day "%s".', $isoDate));
        }

        return $day;
    }

    /** The calendar day a date already represents (its Y-m-d), whatever time zone it carries. */
    public static function of(\DateTimeImmutable $date): \DateTimeImmutable
    {
        return self::fromString($date->format('Y-m-d'));
    }

    /** Today's calendar day in the given time zone. */
    public static function todayIn(\DateTimeImmutable $now, string $timezone): \DateTimeImmutable
    {
        return self::fromString($now->setTimezone(new \DateTimeZone($timezone))->format('Y-m-d'));
    }
}
