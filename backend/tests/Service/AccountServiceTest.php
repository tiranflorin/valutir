<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Dto\UpdateProfileRequest;
use App\Entity\EmailChangeRequest;
use App\Entity\User;
use App\Repository\EmailChangeRequestRepository;
use App\Service\AccountMailer;
use App\Service\AccountService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AccountServiceTest extends TestCase
{
    public function testDescribeIncludesPendingEmailChange(): void
    {
        $user = $this->user();
        $repository = $this->createStub(EmailChangeRequestRepository::class);
        $repository->method('findPendingForUser')->willReturn(
            new EmailChangeRequest($user, 'new@example.test', str_repeat('a', 64), new \DateTimeImmutable('+1 day')),
        );

        $service = $this->service(emailChangeRequestRepository: $repository);

        self::assertSame([
            'email' => 'ada@example.test',
            'name' => 'Ada',
            'defaultCurrency' => 'EUR',
            'pendingEmail' => 'new@example.test',
        ], $service->describe($user));
    }

    public function testUpdateProfileOnlyChangesProvidedFields(): void
    {
        $user = $this->user();
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::exactly(2))->method('flush');
        $service = $this->service(entityManager: $entityManager);

        $request = new UpdateProfileRequest();
        $request->defaultCurrency = 'RON';
        $service->updateProfile($user, $request);
        self::assertSame('Ada', $user->getName());
        self::assertSame('RON', $user->getDefaultCurrency());

        $request = new UpdateProfileRequest();
        $request->name = '  Ada Lovelace ';
        $service->updateProfile($user, $request);
        self::assertSame('Ada Lovelace', $user->getName());
        self::assertSame('RON', $user->getDefaultCurrency());
    }

    public function testChangePasswordHashesAndRevokesExistingTokens(): void
    {
        $user = $this->user();
        $hasher = $this->createStub(UserPasswordHasherInterface::class);
        $hasher->method('hashPassword')->willReturn('new-hash');

        $this->service(passwordHasher: $hasher)->changePassword($user, 'Newer-pass1');

        self::assertSame('new-hash', $user->getPassword());
        self::assertSame(2, $user->getTokenVersion());
    }

    public function testSignOutEverywhereRevokesExistingTokens(): void
    {
        $user = $this->user();

        $this->service()->signOutEverywhere($user);

        self::assertSame(2, $user->getTokenVersion());
    }

    public function testDeleteAccountRemovesUserAndSendsConfirmation(): void
    {
        $user = $this->user();
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('remove')->with($user);
        $entityManager->expects(self::once())->method('flush');
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())->method('send')->with(self::callback(static function (Email $email): bool {
            self::assertSame(['ada@example.test'], array_map(static fn (Address $a): string => $a->getAddress(), $email->getTo()));
            self::assertSame('Your ValuTir account was deleted', $email->getSubject());

            return true;
        }));

        $this->service(entityManager: $entityManager, mailer: $mailer)->deleteAccount($user);
    }

    private function user(): User
    {
        return (new User())->setEmail('ada@example.test')->setName('Ada')->setPassword('old-hash');
    }

    private function service(
        ?EntityManagerInterface $entityManager = null,
        ?EmailChangeRequestRepository $emailChangeRequestRepository = null,
        ?UserPasswordHasherInterface $passwordHasher = null,
        ?MailerInterface $mailer = null,
    ): AccountService {
        return new AccountService(
            $entityManager ?? $this->createStub(EntityManagerInterface::class),
            $emailChangeRequestRepository ?? $this->createStub(EmailChangeRequestRepository::class),
            $passwordHasher ?? $this->createStub(UserPasswordHasherInterface::class),
            new AccountMailer($mailer ?? $this->createStub(MailerInterface::class), new NullLogger(), 'http://frontend.test'),
            new NullLogger(),
        );
    }
}
