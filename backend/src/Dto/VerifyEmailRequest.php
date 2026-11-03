<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class VerifyEmailRequest
{
    #[Assert\NotBlank(message: 'This verification link is invalid or expired.')]
    #[Assert\Regex(pattern: '/\A[a-f0-9]{64}\z/', message: 'This verification link is invalid or expired.')]
    public ?string $token = null;
}
