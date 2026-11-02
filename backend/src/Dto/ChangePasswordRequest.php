<?php

declare(strict_types=1);

namespace App\Dto;

use App\Validator\PasswordPolicy;
use Symfony\Component\Validator\Constraints as Assert;

final class ChangePasswordRequest
{
    #[Assert\NotBlank]
    #[Assert\Length(max: 4096)]
    public ?string $currentPassword = null;

    #[Assert\NotBlank]
    #[Assert\Length(max: 4096)]
    #[PasswordPolicy]
    public ?string $newPassword = null;
}
