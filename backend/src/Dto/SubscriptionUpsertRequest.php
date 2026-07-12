<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class SubscriptionUpsertRequest
{
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    public ?string $serviceName = null;

    #[Assert\NotNull]
    #[Assert\PositiveOrZero]
    public ?float $amount = null;

    #[Assert\NotBlank]
    #[Assert\Currency]
    public ?string $currency = null;

    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])]
    public ?string $billingCadence = null;

    #[Assert\Length(max: 100)]
    public ?string $category = null;

    #[Assert\Date]
    public ?string $startedAt = null;

    #[Assert\Date]
    public ?string $nextBillingDate = null;

    public ?string $notes = null;

    #[Assert\Length(max: 100)]
    public ?string $paymentMethod = null;

    public ?bool $isActive = true;

    public ?bool $autoRenew = true;

    #[Assert\Date]
    public ?string $cancelledAt = null;
}
