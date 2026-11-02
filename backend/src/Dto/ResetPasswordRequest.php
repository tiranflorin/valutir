<?php

declare(strict_types=1);

namespace App\Dto;

use App\Validator\PasswordPolicy;
use Symfony\Component\Validator\Constraints as Assert;

final class ResetPasswordRequest
{
    /** The raw token from the emailed reset link (64 hex characters). */
    #[Assert\NotBlank(message: 'The password reset link is invalid or expired.')]
    #[Assert\Regex(pattern: '/\A[a-f0-9]{64}\z/i', message: 'The password reset link is invalid or expired.')]
    public ?string $token = null;

    #[Assert\NotBlank]
    #[Assert\Length(max: 4096)]
    #[PasswordPolicy]
    public ?string $newPassword = null;
}
