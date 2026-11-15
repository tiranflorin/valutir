<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * What a subscription costs: the amount (a 2-decimal string, as stored), its currency and how often it's charged.
 */
final readonly class PriceTerms
{
    public function __construct(
        public string $amount,
        public string $currency,
        public string $cadence,
    ) {
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount && $this->currency === $other->currency && $this->cadence === $other->cadence;
    }
}
