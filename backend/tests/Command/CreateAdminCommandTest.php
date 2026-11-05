<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Clock\Clock;
use App\Command\CreateAdminCommand;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Validation;

final class CreateAdminCommandTest extends TestCase
{
    public function testGrantsTheRoleToAnExistingAccountWithoutTouchingItsPassword(): void
    {
        $user = (new User())->setEmail('owner@example.test');
        $user->setPassword('existing-hash');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('flush');
        $entityManager->expects(self::never())->method('persist');
        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects(self::never())->method('hashPassword');

        $tester = $this->tester($user, $entityManager, $hasher);

        self::assertSame(Command::SUCCESS, $tester->execute(['email' => ' Owner@Example.test '], ['interactive' => false]));
        self::assertContains('ROLE_ADMIN', $user->getRoles());
        self::assertSame('existing-hash', $user->getPassword());
    }

    public function testAnExistingAdminIsLeftAlone(): void
    {
        $user = (new User())->setEmail('owner@example.test')->setRoles(['ROLE_ADMIN']);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('flush');

        $tester = $this->tester($user, $entityManager);

        self::assertSame(Command::SUCCESS, $tester->execute(['email' => 'owner@example.test'], ['interactive' => false]));
        self::assertStringContainsString('already an admin', $tester->getDisplay());
    }

    public function testRefusesToCreateAnAccountWithoutAnInteractiveTerminal(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');

        $tester = $this->tester(null, $entityManager);

        self::assertSame(Command::FAILURE, $tester->execute(['email' => 'new@example.test'], ['interactive' => false]));
        self::assertStringContainsString('Register it in the app first', $tester->getDisplay());
    }

    public function testCreatesAVerifiedAdminFromHiddenPromptsAndNeverPrintsThePassword(): void
    {
        $persisted = null;
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist')->willReturnCallback(static function (object $entity) use (&$persisted): void {
            $persisted = $entity;
        });
        $entityManager->expects(self::once())->method('flush');
        $hasher = $this->createStub(UserPasswordHasherInterface::class);
        $hasher->method('hashPassword')->willReturn('hashed');

        $tester = $this->tester(null, $entityManager, $hasher);
        $tester->setInputs(['Str0ng-pass', 'Str0ng-pass']);

        self::assertSame(Command::SUCCESS, $tester->execute(['email' => 'new@example.test', '--name' => 'Ops']));
        self::assertInstanceOf(User::class, $persisted);
        self::assertSame('new@example.test', $persisted->getEmail());
        self::assertSame('hashed', $persisted->getPassword());
        self::assertContains('ROLE_ADMIN', $persisted->getRoles());
        self::assertTrue($persisted->isEmailVerified());
        self::assertStringNotContainsString('Str0ng-pass', $tester->getDisplay());
    }

    public function testRejectsAWeakPassword(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');

        $tester = $this->tester(null, $entityManager);
        $tester->setInputs(['short']);

        self::assertSame(Command::INVALID, $tester->execute(['email' => 'new@example.test']));
    }

    public function testRejectsMismatchedPasswords(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');

        $tester = $this->tester(null, $entityManager);
        $tester->setInputs(['Str0ng-pass', 'Str0ng-pasS']);

        self::assertSame(Command::INVALID, $tester->execute(['email' => 'new@example.test']));
        self::assertStringContainsString('do not match', $tester->getDisplay());
    }

    public function testRejectsAnInvalidEmail(): void
    {
        $tester = $this->tester(null, $this->createStub(EntityManagerInterface::class));

        self::assertSame(Command::INVALID, $tester->execute(['email' => 'not-an-email'], ['interactive' => false]));
    }

    private function tester(?User $existing, EntityManagerInterface $entityManager, ?UserPasswordHasherInterface $hasher = null): CommandTester
    {
        $repository = $this->createStub(UserRepository::class);
        $repository->method('findOneByEmail')->willReturn($existing);
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable('2026-11-05 10:00:00'));

        return new CommandTester(new CreateAdminCommand(
            $repository,
            $entityManager,
            $hasher ?? $this->createStub(UserPasswordHasherInterface::class),
            Validation::createValidatorBuilder()->getValidator(),
            $clock,
            new NullLogger(),
        ));
    }
}
