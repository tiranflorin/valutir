<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class DeleteAccountRequest
{
    #[Assert\NotBlank]
    #[Assert\Length(max: 4096)]
    public ?string $currentPassword = null;
}
