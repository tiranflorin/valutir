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

    #[Assert\Callback]
    public function validateHasChanges(ExecutionContextInterface $context): void
    {
        if (null === $this->name && null === $this->defaultCurrency) {
            $context->buildViolation('Provide at least one of: name, defaultCurrency.')->addViolation();
        }
    }
}
