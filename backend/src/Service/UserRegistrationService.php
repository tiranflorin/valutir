<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\RegisterRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Registers users without revealing whether an email is already taken: the caller
 * always gets the same outcome, and the owner of an existing account is notified by email.
 * A new account starts unverified and is sent a verification link.
 */
final readonly class UserRegistrationService
{
    public function __construct(
        private UserRepository $userRepository,
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
        private AccountMailer $accountMailer,
        private EmailVerificationService $emailVerificationService,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * @param RegisterRequest $request an already validated request
     */
    public function register(RegisterRequest $request): void
    {
        $email = User::normalizeEmail((string) $request->email);

        $user = (new User())
            ->setEmail($email)
            ->setName(trim((string) $request->name))
            ->setRoles(['ROLE_USER']);
        // Hash before the existence check so both paths cost the same time.
        $user->setPassword($this->passwordHasher->hashPassword($user, (string) $request->password));

        if (null !== $this->userRepository->findOneByEmail($email)) {
            $this->notifyExistingAccount($email);

            return;
        }

        try {
            $this->entityManager->persist($user);
            $this->entityManager->flush();
        } catch (UniqueConstraintViolationException) {
            // Another request registered the same email concurrently.
            $this->notifyExistingAccount($email);

            return;
        }

        // Both paths send exactly one email, so neither timing nor inbox reveals which one ran.
        $this->emailVerificationService->sendVerification($user);
    }

    private function notifyExistingAccount(string $email): void
    {
        $this->logger->info('Registration attempted for an existing account.');
        // AccountMailer never surfaces delivery problems: the response must not differ.
        $this->accountMailer->sendExistingAccountNotice($email);
    }
}
