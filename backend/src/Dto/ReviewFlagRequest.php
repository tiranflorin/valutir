<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Body of PUT /api/subs/{id}/review: flags a subscription for the owner to decide on later.
 */
final class ReviewFlagRequest
{
    /** Why it needs a review, e.g. "Check if the kids still use it". Optional. */
    #[Assert\Length(max: 500)]
    public ?string $note = null;
}
