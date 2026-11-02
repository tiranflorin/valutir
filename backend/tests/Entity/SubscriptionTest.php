<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Subscription;
use PHPUnit\Framework\TestCase;

final class SubscriptionTest extends TestCase
{
    public function testToArrayExposesTrialFieldsFromTheirOwnProperties(): void
    {
        $subscription = new Subscription();
        $subscription->setStartedAt(new \DateTimeImmutable('2026-11-01'));
        $subscription->setTrialEndsAt(new \DateTimeImmutable('2026-11-15'));
        $subscription->setTrialReminderSentAt(new \DateTimeImmutable('2026-11-13 09:00:00+00:00'));
        $subscription->onPrePersist();

        $data = $subscription->toArray();

        self::assertSame('2026-11-01', $data['startedAt']);
        self::assertSame('2026-11-15', $data['trialEndsAt']);
        self::assertSame('2026-11-13T09:00:00+00:00', $data['trialReminderSentAt']);
    }

    public function testToArrayReturnsNullTrialFieldsWhenUnset(): void
    {
        $subscription = new Subscription();
        $subscription->setStartedAt(new \DateTimeImmutable('2026-11-01'));
        $subscription->onPrePersist();

        $data = $subscription->toArray();

        self::assertNull($data['trialEndsAt']);
        self::assertNull($data['trialReminderSentAt']);
    }
}
