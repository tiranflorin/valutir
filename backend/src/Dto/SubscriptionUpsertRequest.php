<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

final class SubscriptionUpsertRequest
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
    #[Assert\Choice(choices: ['weekly', 'monthly', 'quarterly', 'yearly'])]
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

    public ?bool $autoRenew = true;

    public bool $b2b = false;

    /** Whether the bill is split equally within the household. Personal subscriptions only. */
    public bool $householdShared = false;

    /** People splitting the bill, the owner included. Required when householdShared is true. */
    #[Assert\Range(min: 2, max: 10, notInRangeMessage: 'A shared subscription is split between {{ min }} and {{ max }} people.')]
    public ?int $householdSize = null;

    #[Assert\Date]
    public ?string $cancelledAt = null;

    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['active', 'trial', 'other', 'cancelled'])]
    public ?string $status = null;

    #[Assert\Date]
    public ?string $trialEndsAt = null;

    #[Assert\Callback]
    public function validateHouseholdSharing(ExecutionContextInterface $context): void
    {
        if (!$this->householdShared) {
            return;
        }
        if ($this->b2b) {
            $context->buildViolation("Business subscriptions can't be shared with a household.")
                ->atPath('householdShared')
                ->addViolation();
        }
        if (null === $this->householdSize) {
            $context->buildViolation('Choose how many people share this subscription.')
                ->atPath('householdSize')
                ->addViolation();
        }
    }
}
