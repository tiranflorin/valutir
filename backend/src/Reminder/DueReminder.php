<?php

declare(strict_types=1);

namespace App\Reminder;

use App\Entity\Subscription;

/**
 * One upcoming charge to mention in today's digest.
 */
final readonly class DueReminder
{
    public function __construct(
        public Subscription $subscription,
        public string $kind,
        public \DateTimeImmutable $chargeDate,
        public int $daysUntil,
    ) {
    }
}
