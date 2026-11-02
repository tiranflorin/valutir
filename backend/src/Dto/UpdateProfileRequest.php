<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\User;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * Partial update: a field left out (null) keeps its current value.
 */
final class UpdateProfileRequest
{
    #[Assert\NotBlank(allowNull: true, normalizer: 'trim')]
    #[Assert\Length(max: 255)]
    public ?string $name = null;

    #[Assert\Choice(choices: User::SUPPORTED_CURRENCIES)]
    public ?string $defaultCurrency = null;

    /** IANA time zone, e.g. "Europe/Bucharest"; used for reminder timing and billing dates. */
    #[Assert\Length(max: 64)]
    #[Assert\Timezone]
    public ?string $timezone = null;

    public ?bool $remindersEnabled = null;

    #[Assert\Callback]
    public function validateHasChanges(ExecutionContextInterface $context): void
    {
        if (null === $this->name && null === $this->defaultCurrency && null === $this->timezone && null === $this->remindersEnabled) {
            $context->buildViolation('Provide at least one of: name, defaultCurrency, timezone, remindersEnabled.')->addViolation();
        }
    }
}
