<?php

declare(strict_types=1);

namespace App\Tests\Billing;

use App\Billing\BillingSchedule;
use App\Billing\CalendarDay;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class BillingScheduleTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string, string, string}>
     */
    public static function nextCharges(): iterable
    {
        // anchor, cadence, today, expected next charge on or after today
        yield 'anchor still in the future' => ['2026-11-21', 'monthly', '2026-11-02', '2026-11-21'];
        yield 'charge due today' => ['2026-07-21', 'monthly', '2026-11-21', '2026-11-21'];
        yield 'monthly months behind (Netflix in the dev data)' => ['2026-07-21', 'monthly', '2026-11-02', '2026-11-21'];
        yield 'yearly a year later' => ['2026-07-23', 'yearly', '2026-11-02', '2027-07-23'];
        yield 'quarterly' => ['2026-01-15', 'quarterly', '2026-11-02', '2027-01-15'];
        yield 'weekly' => ['2026-10-01', 'weekly', '2026-11-02', '2026-11-05'];
        yield 'daily' => ['2026-10-01', 'daily', '2026-11-02', '2026-11-02'];
        yield 'month end clamps to February' => ['2026-01-31', 'monthly', '2026-02-01', '2026-02-28'];
        yield 'month end returns to the 31st after February' => ['2026-01-31', 'monthly', '2026-03-01', '2026-03-31'];
        yield 'leap day yearly clamps to 28 Feb' => ['2024-02-29', 'yearly', '2025-01-01', '2025-02-28'];
        yield 'leap day yearly returns on the next leap year' => ['2024-02-29', 'yearly', '2027-03-01', '2028-02-29'];
        yield 'many years behind' => ['2001-05-31', 'monthly', '2026-11-02', '2026-11-30'];
    }

    #[DataProvider('nextCharges')]
    public function testNextChargeOnOrAfterToday(string $anchor, string $cadence, string $today, string $expected): void
    {
        $next = (new BillingSchedule())->nextChargeOnOrAfter(CalendarDay::fromString($anchor), $cadence, CalendarDay::fromString($today));

        self::assertSame($expected, $next->format('Y-m-d'));
    }

    public function testChargesAreCountedFromTheAnchorNotFromThePreviousCharge(): void
    {
        $schedule = new BillingSchedule();
        $anchor = CalendarDay::fromString('2026-01-31');

        $charges = array_map(static fn (int $n): string => $schedule->charge($anchor, 'monthly', $n)->format('Y-m-d'), range(0, 3));

        self::assertSame(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'], $charges);
    }

    public function testUnknownCadenceIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        (new BillingSchedule())->nextChargeOnOrAfter(CalendarDay::fromString('2026-01-01'), 'fortnightly', CalendarDay::fromString('2026-11-02'));
    }

    public function testTodayFollowsTheUsersTimeZone(): void
    {
        // 23:30 UTC on 1 Nov is already 2 Nov in Bucharest (UTC+2) but still 1 Nov in UTC.
        $now = new \DateTimeImmutable('2026-11-01 23:30:00', new \DateTimeZone('UTC'));

        self::assertSame('2026-11-02', CalendarDay::todayIn($now, 'Europe/Bucharest')->format('Y-m-d'));
        self::assertSame('2026-11-01', CalendarDay::todayIn($now, 'UTC')->format('Y-m-d'));
    }
}
