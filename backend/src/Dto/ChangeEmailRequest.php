<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class ChangeEmailRequest
{
    #[Assert\NotBlank(normalizer: 'trim')]
    #[Assert\Length(max: 180)]
    #[Assert\Email(mode: Assert\Email::VALIDATION_MODE_HTML5)]
    public ?string $newEmail = null;

    #[Assert\NotBlank]
    #[Assert\Length(max: 4096)]
    public ?string $currentPassword = null;
}
