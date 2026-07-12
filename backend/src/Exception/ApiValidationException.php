<?php

namespace App\Exception;

use RuntimeException;
use Symfony\Component\Validator\ConstraintViolationInterface;
use Symfony\Component\Validator\ConstraintViolationListInterface;

class ApiValidationException extends RuntimeException
{
    private array $errors;

    public function __construct(
        ConstraintViolationListInterface $violations,
        string $message = 'Validation failed.',
        int $code = 0,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, $code, $previous);

        $this->errors = $this->normalizeViolations($violations);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    private function normalizeViolations(ConstraintViolationListInterface $violations): array
    {
        $errors = [];

        /** @var ConstraintViolationInterface $violation */
        foreach ($violations as $violation) {
            $path = $violation->getPropertyPath() ?: 'general';
            $errors[$path][] = $violation->getMessage();
        }

        return $errors;
    }
}
