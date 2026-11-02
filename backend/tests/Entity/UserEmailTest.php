<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\EmailChangeRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use PHPUnit\Framework\TestCase;

final class UserEmailTest extends TestCase
{
    public function testEmailsAreStoredTrimmedAndLowercase(): void
    {
        self::assertSame('ada@example.test', (new User())->setEmail('  Ada@Example.TEST ')->getEmail());
        self::assertSame('ada@example.test', (new User())->setEmail('ADA@EXAMPLE.TEST')->getUserIdentifier());
        self::assertSame('zoë@exämple.test', User::normalizeEmail('ZOË@EXÄMPLE.TEST'));
    }

    public function testPendingEmailChangesAreNormalisedToo(): void
    {
        $request = new EmailChangeRequest(new User(), ' New@Example.test ', str_repeat('a', 64), new \DateTimeImmutable('+1 day'));

        self::assertSame('new@example.test', $request->getNewEmail());
    }

    public function testSignInLooksUsersUpIgnoringCase(): void
    {
        $user = (new User())->setEmail('ada@example.test');
        $repository = $this->getMockBuilder(UserRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy'])
            ->getMock();
        $repository->expects(self::exactly(2))->method('findOneBy')->with(['email' => 'ada@example.test'])->willReturn($user);

        self::assertSame($user, $repository->loadUserByIdentifier(' ADA@Example.Test '));
        self::assertSame($user, $repository->findOneByEmail('Ada@EXAMPLE.test'));
    }
}
