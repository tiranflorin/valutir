<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\UpdateProfileRequest;
use App\Entity\User;
use App\Repository\EmailChangeRequestRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final readonly class AccountService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private EmailChangeRequestRepository $emailChangeRequestRepository,
        private UserPasswordHasherInterface $passwordHasher,
        private AccountMailer $accountMailer,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * @return array{email: string, emailVerified: bool, name: string|null, defaultCurrency: string, timezone: string, remindersEnabled: bool, pendingEmail: string|null}
     */
    public function describe(User $user): array
    {
        return [
            'email' => $user->getUserIdentifier(),
            'emailVerified' => $user->isEmailVerified(),
            'name' => $user->getName(),
            'defaultCurrency' => $user->getDefaultCurrency(),
            'timezone' => $user->getTimezone(),
            'remindersEnabled' => $user->isRemindersEnabled(),
            'pendingEmail' => $this->emailChangeRequestRepository
                ->findPendingForUser($user, new \DateTimeImmutable())
                ?->getNewEmail(),
        ];
    }

    public function updateProfile(User $user, UpdateProfileRequest $request): void
    {
        if (null !== $request->name) {
            $user->setName(trim($request->name));
        }
        if (null !== $request->defaultCurrency) {
            $user->setDefaultCurrency($request->defaultCurrency);
        }
        if (null !== $request->timezone) {
            $user->setTimezone($request->timezone);
        }
        if (null !== $request->remindersEnabled) {
            $user->setRemindersEnabled($request->remindersEnabled);
        }

        $this->entityManager->flush();
    }

    public function isCurrentPassword(User $user, string $password): bool
    {
        return $this->passwordHasher->isPasswordValid($user, $password);
    }

    /**
     * Changes the password and signs out every other device. The caller should hand
     * the current device a freshly issued token.
     */
    public function changePassword(User $user, string $newPassword): void
    {
        $user->setPassword($this->passwordHasher->hashPassword($user, $newPassword));
        $user->revokeAllTokens();
        $this->entityManager->flush();

        $this->logger->info('Account password changed.', ['user_id' => $user->getId()]);
    }

    public function signOutEverywhere(User $user): void
    {
        $user->revokeAllTokens();
        $this->entityManager->flush();

        $this->logger->info('Account signed out of all sessions.', ['user_id' => $user->getId()]);
    }

    /**
     * Permanently deletes the user. Subscriptions, password reset tokens, and pending
     * email changes are removed by ON DELETE CASCADE foreign keys.
     */
    public function deleteAccount(User $user): void
    {
        $userId = $user->getId();
        $email = $user->getUserIdentifier();

        $this->entityManager->remove($user);
        $this->entityManager->flush();

        $this->logger->info('Account deleted.', ['user_id' => $userId]);
        $this->accountMailer->sendAccountDeletedNotice($email);
    }
}
