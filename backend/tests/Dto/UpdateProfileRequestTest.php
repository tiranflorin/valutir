<?php

declare(strict_types=1);

namespace App\Tests\Dto;

use App\Dto\UpdateProfileRequest;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\ConstraintViolationListInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class UpdateProfileRequestTest extends KernelTestCase
{
    public function testRequiresAtLeastOneField(): void
    {
        self::assertCount(1, $this->validate(new UpdateProfileRequest()));
    }

    public function testRejectsBlankNameAndUnsupportedCurrency(): void
    {
        $request = new UpdateProfileRequest();
        $request->name = '   ';
        $request->defaultCurrency = 'GBP';

        $paths = array_map(
            static fn ($violation): string => $violation->getPropertyPath(),
            iterator_to_array($this->validate($request)),
        );

        self::assertEqualsCanonicalizing(['name', 'defaultCurrency'], $paths);
    }

    public function testAcceptsPartialUpdate(): void
    {
        $request = new UpdateProfileRequest();
        $request->defaultCurrency = 'USD';

        self::assertCount(0, $this->validate($request));
    }

    private function validate(UpdateProfileRequest $request): ConstraintViolationListInterface
    {
        self::bootKernel();

        return self::getContainer()->get(ValidatorInterface::class)->validate($request);
    }
}
