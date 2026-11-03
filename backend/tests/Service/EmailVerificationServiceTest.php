<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Clock\Clock;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AccountMailer;
use App\Service\EmailVerificationService;
use App\Tests\Support\Emails;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

final class EmailVerificationServiceTest extends TestCase
{
    private const string NOW = '2026-11-03 10:00:00';

    private User $user;
    /** @var list<string> tokens from the links emailed so far */
    private array $sentTokens = [];

    protected function setUp(): void
    {
        $this->user = (new User())->setEmail('ada@example.test');
    }

    public function testTheEmailedLinkVerifiesTheAddressOnce(): void
    {
        $service = $this->service();
        $service->sendVerification($this->user);
        self::assertFalse($this->user->isEmailVerified());

        self::assertTrue($service->verify($this->sentTokens[0]));
        self::assertTrue($this->user->isEmailVerified());

        // The token is cleared when used, so the link can't be replayed.
        self::assertFalse($service->verify($this->sentTokens[0]));
    }

    public function testOnlyTheLatestLinkWorks(): void
    {
        $service = $this->service();
        $service->sendVerification($this->user);
        $service->sendVerification($this->user);

        self::assertNotSame($this->sentTokens[0], $this->sentTokens[1]);
        self::assertFalse($service->verify($this->sentTokens[0]));
        self::assertTrue($service->verify($this->sentTokens[1]));
    }

    public function testAnExpiredLinkFails(): void
    {
        $this->service()->sendVerification($this->user);

        $tomorrow = $this->service('2026-11-04 10:00:01');

        self::assertFalse($tomorrow->verify($this->sentTokens[0]));
        self::assertFalse($this->user->isEmailVerified());
    }

    public function testMalformedTokensAreRejectedBeforeAnyLookup(): void
    {
        $repository = $this->createMock(UserRepository::class);
        $repository->expects(self::never())->method('findOneByEmailVerificationTokenHash');

        foreach (['', 'abc', str_repeat('g', 64), str_repeat('A', 64), str_repeat('a', 64)."\n"] as $token) {
            self::assertFalse($this->service(repository: $repository)->verify($token));
        }
    }

    public function testAVerifiedAddressIsNotSentAnotherLink(): void
    {
        $this->user->markEmailVerified(new \DateTimeImmutable(self::NOW));

        $this->service()->sendVerification($this->user);

        self::assertSame([], $this->sentTokens);
    }

    private function service(string $now = self::NOW, ?UserRepository $repository = null): EmailVerificationService
    {
        if (null === $repository) {
            $repository = $this->createStub(UserRepository::class);
            $repository->method('findOneByEmailVerificationTokenHash')->willReturnCallback(
                fn (string $hash): ?User => $this->storedHash() === $hash ? $this->user : null,
            );
        }
        $mailer = $this->createStub(MailerInterface::class);
        $mailer->method('send')->willReturnCallback(function (Email $email): void {
            self::assertSame(1, preg_match('~/verify-email\?token=([a-f0-9]{64})~', (string) $email->getTextBody(), $matches));
            $this->sentTokens[] = $matches[1];
        });
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable($now));

        return new EmailVerificationService(
            $repository,
            $this->createStub(EntityManagerInterface::class),
            new AccountMailer($mailer, Emails::factory(), new NullLogger()),
            $clock,
            new NullLogger(),
        );
    }

    private function storedHash(): ?string
    {
        return (new \ReflectionProperty(User::class, 'emailVerificationTokenHash'))->getValue($this->user);
    }
}
