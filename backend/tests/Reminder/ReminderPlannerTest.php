<?php

declare(strict_types=1);

namespace App\Tests\Reminder;

use App\Billing\BillingSchedule;
use App\Billing\CalendarDay;
use App\Entity\ReminderLog;
use App\Entity\Subscription;
use App\Reminder\DueReminder;
use App\Reminder\ReminderPlanner;
use App\Repository\ReminderLogRepository;
use PHPUnit\Framework\TestCase;

final class ReminderPlannerTest extends TestCase
{
    private const string TODAY = '2026-11-02';

    public function testRemindsWithinEachCadencesLeadTime(): void
    {
        $due = $this->plan([
            $this->subscription(1, 'Monthly in 3 days', 'monthly', '2026-11-05'),
            $this->subscription(2, 'Monthly in 4 days', 'monthly', '2026-11-06'),
            $this->subscription(3, 'Yearly in 7 days', 'yearly', '2026-11-09'),
            $this->subscription(4, 'Yearly in 8 days', 'yearly', '2026-11-10'),
            $this->subscription(5, 'Weekly tomorrow', 'weekly', '2026-11-03'),
            $this->subscription(6, 'Weekly in 2 days', 'weekly', '2026-11-04'),
            $this->subscription(7, 'Due today', 'monthly', self::TODAY),
        ]);

        self::assertSame(['Due today', 'Weekly tomorrow', 'Monthly in 3 days', 'Yearly in 7 days'], $this->names($due));
        self::assertSame([0, 1, 3, 7], array_map(static fn (DueReminder $r): int => $r->daysUntil, $due));
    }

    public function testUsesTheRealNextChargeWhenTheStoredDateIsStale(): void
    {
        // Stored 21 Jul, monthly: the next charge is 21 Nov (19 days away) - not due, and never "21 Jul".
        self::assertSame([], $this->plan([$this->subscription(1, 'Netflix', 'monthly', '2026-07-21')]));

        $due = $this->plan([$this->subscription(1, 'Netflix', 'monthly', '2026-07-04')]);
        self::assertSame('2026-11-04', $due[0]->chargeDate->format('Y-m-d'));
    }

    public function testTrialsAreRemindedTwoDaysBeforeTheyEndAndListedFirst(): void
    {
        $trial = $this->subscription(1, 'Trial', 'monthly', '2026-11-04', 'trial');
        $trial->setTrialEndsAt(CalendarDay::fromString('2026-11-04'));
        $lateTrial = $this->subscription(2, 'Trial in 3 days', 'monthly', '2026-11-05', 'trial');
        $lateTrial->setTrialEndsAt(CalendarDay::fromString('2026-11-05'));
        $renewal = $this->subscription(3, 'Renewal today', 'monthly', self::TODAY);

        $due = $this->plan([$renewal, $lateTrial, $trial]);

        self::assertSame(['Trial', 'Renewal today'], $this->names($due));
        self::assertSame(ReminderLog::KIND_TRIAL_ENDING, $due[0]->kind);
    }

    public function testSkipsAlreadySentNonRenewingCancelledAndDeleted(): void
    {
        $sent = $this->subscription(1, 'Already sent', 'monthly', '2026-11-04');
        $notRenewing = $this->subscription(2, 'Not renewing', 'monthly', '2026-11-04');
        $notRenewing->setAutoRenew(false);
        $cancelled = $this->subscription(3, 'Cancelled', 'monthly', '2026-11-04', 'cancelled');
        $deleted = $this->subscription(4, 'Deleted', 'monthly', '2026-11-04');
        $deleted->setDeletedAt(new \DateTimeImmutable());

        $alreadySent = [ReminderLogRepository::key(1, ReminderLog::KIND_RENEWAL, CalendarDay::fromString('2026-11-04')) => true];

        self::assertSame([], $this->plan([$sent, $notRenewing, $cancelled, $deleted], $alreadySent));
    }

    /**
     * @param list<Subscription>  $subscriptions
     * @param array<string, true> $alreadySent
     *
     * @return list<DueReminder>
     */
    private function plan(array $subscriptions, array $alreadySent = []): array
    {
        return (new ReminderPlanner(new BillingSchedule()))->plan($subscriptions, CalendarDay::fromString(self::TODAY), $alreadySent);
    }

    /**
     * @param list<DueReminder> $due
     *
     * @return list<string>
     */
    private function names(array $due): array
    {
        return array_map(static fn (DueReminder $r): string => (string) $r->subscription->getServiceName(), $due);
    }

    private function subscription(int $id, string $name, string $cadence, string $nextBillingDate, string $status = 'active'): Subscription
    {
        $subscription = (new Subscription())->setServiceName($name)->setBillingCadence($cadence)->setNextBillingDate(CalendarDay::fromString($nextBillingDate));
        $subscription->setStatus($status);
        (new \ReflectionProperty(Subscription::class, 'id'))->setValue($subscription, $id);

        return $subscription;
    }
}
