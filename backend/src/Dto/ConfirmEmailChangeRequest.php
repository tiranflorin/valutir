<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class ConfirmEmailChangeRequest
{
    #[Assert\NotBlank]
    #[Assert\Regex(pattern: '/\A[a-f0-9]{64}\z/', message: 'The confirmation link is invalid or expired.')]
    public ?string $token = null;
}
