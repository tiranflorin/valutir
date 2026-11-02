<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\PasswordResetToken;
use App\Entity\User;
use App\Repository\PasswordResetTokenRepository;
use App\Service\PasswordResetService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PasswordResetServiceTest extends TestCase
{
    public function testCreateTokenPersistsOnlyItsHashAndExpiresAfterOneHour(): void
    {
        $user = new User();
        $repository = $this->createMock(PasswordResetTokenRepository::class);
        $repository->expects(self::once())->method('deleteForUser')->with($user);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $persisted = null;
        $entityManager->expects(self::once())->method('persist')->willReturnCallback(
            static function (PasswordResetToken $token) use (&$persisted): void {
                $persisted = $token;
            },
        );
        $entityManager->expects(self::once())->method('beginTransaction');
        $entityManager->expects(self::once())->method('flush');
        $entityManager->expects(self::once())->method('commit');

        $service = new PasswordResetService($repository, $entityManager, $this->createStub(UserPasswordHasherInterface::class));
        $rawToken = $service->createToken($user);

        self::assertSame(64, strlen($rawToken));
        self::assertNotSame($rawToken, $persisted->getTokenHash());
        self::assertSame(hash('sha256', $rawToken), $persisted->getTokenHash());
        self::assertSame($user, $persisted->getUser());
        self::assertGreaterThanOrEqual(3599, $persisted->getExpiresAt()->getTimestamp() - time());
        self::assertLessThanOrEqual(3600, $persisted->getExpiresAt()->getTimestamp() - time());
    }

    public function testResetPasswordHashesNewPasswordAndConsumesToken(): void
    {
        $user = (new User())->setPassword('old-hash');
        $token = new PasswordResetToken($user, hash('sha256', str_repeat('a', 64)), new \DateTimeImmutable('+1 hour'));
        $repository = $this->createMock(PasswordResetTokenRepository::class);
        $repository->expects(self::once())->method('findValid')->with(hash('sha256', str_repeat('a', 64)), self::isInstanceOf(\DateTimeImmutable::class))->willReturn($token);
        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects(self::once())->method('hashPassword')->with($user, 'A-new-password9!')->willReturn('new-hash');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('remove')->with($token);
        $entityManager->expects(self::once())->method('beginTransaction');
        $entityManager->expects(self::once())->method('flush');
        $entityManager->expects(self::once())->method('commit');

        $service = new PasswordResetService($repository, $entityManager, $hasher);

        self::assertTrue($service->resetPassword(str_repeat('a', 64), 'A-new-password9!'));
        self::assertSame('new-hash', $user->getPassword());
        self::assertSame(2, $user->getTokenVersion(), 'A reset signs out every device.');
    }

    public function testInvalidOrExpiredTokenDoesNotChangePassword(): void
    {
        $repository = $this->createMock(PasswordResetTokenRepository::class);
        $repository->expects(self::once())->method('findValid')->willReturn(null);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('beginTransaction');
        $entityManager->expects(self::once())->method('flush');
        $entityManager->expects(self::once())->method('commit');
        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects(self::never())->method('hashPassword');

        $service = new PasswordResetService($repository, $entityManager, $hasher);

        self::assertFalse($service->resetPassword(str_repeat('b', 64), 'A-new-password9!'));
    }

    public function testMalformedTokenIsRejectedBeforeLookup(): void
    {
        $repository = $this->createMock(PasswordResetTokenRepository::class);
        $repository->expects(self::never())->method('findValid');
        $service = new PasswordResetService(
            $repository,
            $this->createStub(EntityManagerInterface::class),
            $this->createStub(UserPasswordHasherInterface::class),
        );

        self::assertFalse($service->resetPassword('not-a-token', 'A-new-password9!'));
    }
}
