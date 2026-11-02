<?php

declare(strict_types=1);

namespace App\Validator;

use Symfony\Component\Validator\Constraint;

/**
 * A password must have at least 8 characters, plus any two of: an uppercase letter,
 * a number, and a symbol. Mirrors the rule on the frontend password forms.
 */
#[\Attribute(\Attribute::TARGET_PROPERTY | \Attribute::TARGET_METHOD)]
final class PasswordPolicy extends Constraint
{
    public string $message = 'Use a password with at least 8 characters, plus any two of: an uppercase letter, a number, or a symbol.';

    public function __construct(?string $message = null, ?array $groups = null, mixed $payload = null)
    {
        parent::__construct(null, $groups, $payload);

        $this->message = $message ?? $this->message;
    }
}
