<?php

declare(strict_types=1);

namespace App\Validator;

use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class PasswordPolicyValidator extends ConstraintValidator
{
    private const int MIN_LENGTH = 8;
    private const int REQUIRED_CHARACTER_CLASSES = 2;

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof PasswordPolicy) {
            throw new UnexpectedTypeException($constraint, PasswordPolicy::class);
        }

        // Emptiness is NotBlank's job.
        if (null === $value || '' === $value) {
            return;
        }

        if (!\is_string($value)) {
            throw new UnexpectedValueException($value, 'string');
        }

        $characterClasses = \count(array_filter([
            1 === preg_match('/[A-Z]/', $value),
            1 === preg_match('/\d/', $value),
            1 === preg_match('/[^A-Za-z0-9]/', $value),
        ]));

        if (mb_strlen($value) < self::MIN_LENGTH || $characterClasses < self::REQUIRED_CHARACTER_CLASSES) {
            $this->context->buildViolation($constraint->message)->addViolation();
        }
    }
}
