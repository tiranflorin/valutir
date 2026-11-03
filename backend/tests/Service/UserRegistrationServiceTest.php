<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Clock\Clock;
use App\Dto\RegisterRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AccountMailer;
use App\Service\EmailVerificationService;
use App\Service\UserRegistrationService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class UserRegistrationServiceTest extends TestCase
{
    public function testNewEmailIsStoredLowercaseWithHashedPasswordAndTrimmedFields(): void
    {
        $repository = $this->createMock(UserRepository::class);
        $repository->expects(self::once())->method('findOneByEmail')->with('new@example.test')->willReturn(null);
        $persisted = null;
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist')->willReturnCallback(
            static function (User $user) use (&$persisted): void {
                $persisted = $user;
            },
        );
        // Once to create the account, once to store the verification token.
        $entityManager->expects(self::exactly(2))->method('flush');
        $sentLink = null;
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())->method('send')->with(self::callback(static function (Email $email) use (&$sentLink): bool {
            self::assertSame('new@example.test', $email->getTo()[0]->getAddress());
            self::assertSame(1, preg_match('~http://frontend\.test/verify-email\?token=([a-f0-9]{64})~', (string) $email->getTextBody(), $matches));
            $sentLink = $matches[1];

            return true;
        }));

        $this->createService($repository, $entityManager, $mailer)
            ->register($this->request(' New@Example.TEST ', 'Str0ng-pass', '  Ada  '));

        self::assertInstanceOf(User::class, $persisted);
        self::assertSame('new@example.test', $persisted->getEmail());
        self::assertSame('Ada', $persisted->getName());
        self::assertSame('hashed:Str0ng-pass', $persisted->getPassword());
        self::assertSame(['ROLE_USER'], $persisted->getRoles());
        self::assertFalse($persisted->isEmailVerified());
        self::assertTrue($persisted->isEmailVerificationTokenValid(new \DateTimeImmutable('2026-11-03 10:00:00')));
        self::assertNotNull($sentLink);
        // Only the hash is stored, never the token from the link.
        $storedHash = (new \ReflectionProperty(User::class, 'emailVerificationTokenHash'))->getValue($persisted);
        self::assertSame(hash('sha256', $sentLink), $storedHash);
    }

    public function testExistingEmailIsNotRecreatedAndOwnerIsNotified(): void
    {
        $repository = $this->createStub(UserRepository::class);
        $repository->method('findOneByEmail')->willReturn(new User());
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');
        $entityManager->expects(self::never())->method('flush');
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())->method('send')->with(self::callback(static function (Email $email): bool {
            self::assertSame(
                ['taken@example.test'],
                array_map(static fn (Address $address): string => $address->getAddress(), $email->getTo()),
            );
            self::assertStringContainsString('http://frontend.test/request-password-reset', (string) $email->getTextBody());
            self::assertStringNotContainsString('Str0ng-pass', (string) $email->getTextBody());

            return true;
        }));

        $this->createService($repository, $entityManager, $mailer)
            ->register($this->request('taken@example.test', 'Str0ng-pass', 'Ada'));
    }

    public function testMailDeliveryFailureForExistingEmailIsNotSurfaced(): void
    {
        $repository = $this->createStub(UserRepository::class);
        $repository->method('findOneByEmail')->willReturn(new User());
        $mailer = $this->createStub(MailerInterface::class);
        $mailer->method('send')->willThrowException(new TransportException('SMTP down'));

        $this->createService($repository, $this->createStub(EntityManagerInterface::class), $mailer)
            ->register($this->request('taken@example.test', 'Str0ng-pass', 'Ada'));

        $this->addToAssertionCount(1);
    }

    public function testConcurrentDuplicateIsTreatedAsExistingAccount(): void
    {
        $repository = $this->createStub(UserRepository::class);
        $repository->method('findOneByEmail')->willReturn(null);
        $entityManager = $this->createStub(EntityManagerInterface::class);
        $entityManager->method('flush')->willThrowException($this->createStub(UniqueConstraintViolationException::class));
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())->method('send');

        $this->createService($repository, $entityManager, $mailer)
            ->register($this->request('race@example.test', 'Str0ng-pass', 'Ada'));
    }

    private function createService(
        UserRepository $repository,
        EntityManagerInterface $entityManager,
        MailerInterface $mailer,
    ): UserRegistrationService {
        $hasher = $this->createStub(UserPasswordHasherInterface::class);
        $hasher->method('hashPassword')->willReturnCallback(static fn (User $user, string $plain): string => 'hashed:'.$plain);

        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable('2026-11-03 09:00:00'));
        $verification = new EmailVerificationService(
            $repository,
            $entityManager,
            new AccountMailer($mailer, new NullLogger(), 'http://frontend.test/'),
            $clock,
            new NullLogger(),
        );

        return new UserRegistrationService($repository, $entityManager, $hasher, $mailer, $verification, new NullLogger(), 'http://frontend.test/');
    }

    private function request(string $email, string $password, string $name): RegisterRequest
    {
        $request = new RegisterRequest();
        $request->email = $email;
        $request->password = $password;
        $request->name = $name;

        return $request;
    }
}
