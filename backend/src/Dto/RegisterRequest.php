<?php

declare(strict_types=1);

namespace App\Dto;

use App\Validator\PasswordPolicy;
use Symfony\Component\Validator\Constraints as Assert;

final class RegisterRequest
{
    #[Assert\NotBlank(normalizer: 'trim')]
    #[Assert\Length(max: 180)]
    #[Assert\Email(mode: Assert\Email::VALIDATION_MODE_HTML5)]
    public ?string $email = null;

    #[Assert\NotBlank]
    #[Assert\Length(max: 4096)]
    #[PasswordPolicy]
    public ?string $password = null;

    #[Assert\NotBlank(normalizer: 'trim')]
    #[Assert\Length(max: 255)]
    public ?string $name = null;
}
