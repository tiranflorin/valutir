<?php

declare(strict_types=1);

namespace App\Business;

use App\Entity\Subscription;

/**
 * One estimated charge of a business subscription: worked out from its billing date and price
 * history, since ValuTir never sees real payments.
 */
final readonly class BusinessCharge
{
    public function __construct(
        public Subscription $subscription,
        /** Midnight-UTC calendar day (see CalendarDay). */
        public \DateTimeImmutable $date,
        /** The amount on that day, a 2-decimal string. */
        public string $amount,
        public string $currency,
        /** The day is after the owner's today: the charge hasn't gone out yet. */
        public bool $upcoming,
        public bool $invoiceFiled,
    ) {
    }

    /**
     * @return array<string, bool|int|string|null>
     */
    public function toArray(): array
    {
        return [
            'subscriptionId' => $this->subscription->getId(),
            'serviceName' => $this->subscription->getServiceName(),
            'category' => $this->subscription->getCategory(),
            'manageUrl' => $this->subscription->getManageUrl(),
            'date' => $this->date->format('Y-m-d'),
            'amount' => $this->amount,
            'currency' => $this->currency,
            'upcoming' => $this->upcoming,
            'invoiceFiled' => $this->invoiceFiled,
        ];
    }
}
