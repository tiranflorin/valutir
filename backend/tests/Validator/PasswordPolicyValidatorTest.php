<?php

declare(strict_types=1);

namespace App\Tests\Validator;

use App\Validator\PasswordPolicy;
use App\Validator\PasswordPolicyValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Validator\ConstraintValidatorInterface;
use Symfony\Component\Validator\Test\ConstraintValidatorTestCase;

/**
 * @extends ConstraintValidatorTestCase<PasswordPolicyValidator>
 */
final class PasswordPolicyValidatorTest extends ConstraintValidatorTestCase
{
    protected function createValidator(): ConstraintValidatorInterface
    {
        return new PasswordPolicyValidator();
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function acceptedPasswords(): iterable
    {
        yield 'all four checks' => ['Str0ng-pass'];
        yield 'exactly eight characters' => ['Abcdef1g'];
        yield 'length, uppercase, number' => ['Password1'];
        yield 'length, number, symbol' => ['password1!'];
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function rejectedPasswords(): iterable
    {
        yield 'only length' => ['password'];
        yield 'length and lowercase number' => ['password1'];
        yield 'short uppercase only' => ['Abcdef'];
        yield 'short number and symbol' => ['12!'];
        yield 'seven characters with uppercase, number, symbol' => ['Ab1!xyz'];
        yield 'long with only a symbol' => ['correct horse battery'];
    }

    #[DataProvider('acceptedPasswords')]
    public function testAcceptsLongPasswordsWithTwoCharacterClasses(string $password): void
    {
        $this->validator->validate($password, new PasswordPolicy());

        $this->assertNoViolation();
    }

    #[DataProvider('rejectedPasswords')]
    public function testRejectsShortPasswordsOrTooFewCharacterClasses(string $password): void
    {
        $constraint = new PasswordPolicy();
        $this->validator->validate($password, $constraint);

        $this->buildViolation($constraint->message)->assertRaised();
    }

    public function testLeavesEmptyValuesToNotBlank(): void
    {
        $this->validator->validate(null, new PasswordPolicy());
        $this->validator->validate('', new PasswordPolicy());

        $this->assertNoViolation();
    }
}
