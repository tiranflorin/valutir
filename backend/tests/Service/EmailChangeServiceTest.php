<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\EmailChangeRequest;
use App\Entity\User;
use App\Repository\EmailChangeRequestRepository;
use App\Repository\UserRepository;
use App\Service\AccountMailer;
use App\Service\EmailChangeService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class EmailChangeServiceTest extends TestCase
{
    public function testRequestStoresOnlyTokenHashAndEmailsTheNewAddress(): void
    {
        $user = $this->user();
        $requests = $this->createMock(EmailChangeRequestRepository::class);
        $requests->expects(self::once())->method('deleteForUser')->with($user);
        $users = $this->createStub(UserRepository::class);
        $users->method('findOneBy')->willReturn(null);
        $persisted = null;
        $entityManager = $this->transactionalEntityManager();
        $entityManager->expects(self::once())->method('persist')->willReturnCallback(
            static function (EmailChangeRequest $request) use (&$persisted): void {
                $persisted = $request;
            },
        );
        $sent = null;
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())->method('send')->willReturnCallback(static function (Email $email) use (&$sent): void {
            $sent = $email;
        });

        $this->service($requests, $users, $entityManager, $mailer)->requestChange($user, ' new@example.test ');

        self::assertInstanceOf(EmailChangeRequest::class, $persisted);
        self::assertSame('new@example.test', $persisted->getNewEmail());
        self::assertSame('ada@example.test', $user->getEmail(), 'The email only changes after confirmation.');
        self::assertInstanceOf(Email::class, $sent);
        self::assertSame(['new@example.test'], array_map(static fn (Address $a): string => $a->getAddress(), $sent->getTo()));
        self::assertSame(1, preg_match('~http://frontend\.test/confirm-email\?token=([a-f0-9]{64})~', (string) $sent->getTextBody(), $match));
        self::assertSame(hash('sha256', $match[1]), $persisted->getTokenHash());
    }

    public function testRequestForRegisteredAddressIsSilentlyDropped(): void
    {
        $users = $this->createStub(UserRepository::class);
        $users->method('findOneBy')->willReturn(new User());
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::never())->method('send');

        $this->service(null, $users, $entityManager, $mailer)->requestChange($this->user(), 'taken@example.test');
    }

    public function testConfirmChangesEmailRevokesTokensAndNotifiesPreviousAddress(): void
    {
        $user = $this->user();
        $request = new EmailChangeRequest($user, 'new@example.test', hash('sha256', str_repeat('c', 64)), new \DateTimeImmutable('+1 day'));
        $requests = $this->createMock(EmailChangeRequestRepository::class);
        $requests->expects(self::once())->method('findValidByTokenHash')
            ->with(hash('sha256', str_repeat('c', 64)), self::isInstanceOf(\DateTimeImmutable::class))
            ->willReturn($request);
        $users = $this->createStub(UserRepository::class);
        $users->method('findOneBy')->willReturn(null);
        $entityManager = $this->transactionalEntityManager();
        $entityManager->expects(self::once())->method('remove')->with($request);
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())->method('send')->with(self::callback(static function (Email $email): bool {
            self::assertSame(['ada@example.test'], array_map(static fn (Address $a): string => $a->getAddress(), $email->getTo()));
            self::assertStringContainsString('new@example.test', (string) $email->getTextBody());

            return true;
        }));

        self::assertTrue($this->service($requests, $users, $entityManager, $mailer)->confirmChange(str_repeat('c', 64)));
        self::assertSame('new@example.test', $user->getEmail());
        self::assertSame(2, $user->getTokenVersion());
    }

    public function testConfirmWithUnknownOrExpiredTokenFails(): void
    {
        $requests = $this->createStub(EmailChangeRequestRepository::class);
        $requests->method('findValidByTokenHash')->willReturn(null);
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::never())->method('send');

        self::assertFalse($this->service($requests, null, $this->transactionalEntityManager(), $mailer)->confirmChange(str_repeat('d', 64)));
    }

    public function testConfirmFailsWhenAddressWasRegisteredMeanwhile(): void
    {
        $user = $this->user();
        $request = new EmailChangeRequest($user, 'new@example.test', hash('sha256', str_repeat('e', 64)), new \DateTimeImmutable('+1 day'));
        $requests = $this->createStub(EmailChangeRequestRepository::class);
        $requests->method('findValidByTokenHash')->willReturn($request);
        $users = $this->createStub(UserRepository::class);
        $users->method('findOneBy')->willReturn(new User());
        $entityManager = $this->transactionalEntityManager();
        $entityManager->expects(self::once())->method('remove')->with($request);

        self::assertFalse($this->service($requests, $users, $entityManager, null)->confirmChange(str_repeat('e', 64)));
        self::assertSame('ada@example.test', $user->getEmail());
        self::assertSame(1, $user->getTokenVersion());
    }

    private function user(): User
    {
        return (new User())->setEmail('ada@example.test')->setName('Ada');
    }

    private function transactionalEntityManager(): EntityManagerInterface&MockObject
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('beginTransaction');
        $entityManager->expects(self::once())->method('commit');
        $entityManager->expects(self::never())->method('rollback');

        return $entityManager;
    }

    private function service(
        ?EmailChangeRequestRepository $requests,
        ?UserRepository $users,
        ?EntityManagerInterface $entityManager,
        ?MailerInterface $mailer,
    ): EmailChangeService {
        return new EmailChangeService(
            $requests ?? $this->createStub(EmailChangeRequestRepository::class),
            $users ?? $this->createStub(UserRepository::class),
            $entityManager ?? $this->createStub(EntityManagerInterface::class),
            new AccountMailer($mailer ?? $this->createStub(MailerInterface::class), new NullLogger(), 'http://frontend.test/'),
            new NullLogger(),
        );
    }
}
