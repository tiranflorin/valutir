<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\PasswordResetToken;
use App\Entity\User;
use App\Repository\PasswordResetTokenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final readonly class PasswordResetService
{
    private const TOKEN_TTL = 3600;

    public function __construct(
        private PasswordResetTokenRepository $tokenRepository,
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
        private LoggerInterface $logger,
    ) {
    }

    public function createToken(User $user): string
    {
        $rawToken = bin2hex(random_bytes(32));
        $now = new \DateTimeImmutable();

        $this->transaction(function () use ($user, $rawToken, $now): void {
            $this->tokenRepository->deleteForUser($user);
            $this->entityManager->persist(new PasswordResetToken(
                $user,
                hash('sha256', $rawToken),
                $now->modify(sprintf('+%d seconds', self::TOKEN_TTL)),
            ));
        });

        return $rawToken;
    }

    public function resetPassword(string $rawToken, string $newPassword): bool
    {
        if (!preg_match('/\A[a-f0-9]{64}\z/i', $rawToken)) {
            return false;
        }

        $user = $this->transaction(function () use ($rawToken, $newPassword): ?User {
            $token = $this->tokenRepository->findValid(hash('sha256', $rawToken), new \DateTimeImmutable());
            if (null === $token) {
                return null;
            }

            $user = $token->getUser();
            $user->setPassword($this->passwordHasher->hashPassword($user, $newPassword));
            // A reset usually means the account may be compromised: sign out every device.
            $user->revokeAllTokens();
            // The reset link was opened from this inbox, which proves the owner controls it.
            $user->markEmailVerified(new \DateTimeImmutable());
            $this->entityManager->remove($token);

            return $user;
        });
        if (null === $user) {
            return false;
        }
        // Logged once the transaction has committed, so a failed save is never recorded as a reset.
        $this->logger->notice('Account password reset from an email link.', ['user_id' => $user->getId()]);

        return true;
    }

    private function transaction(callable $callback): mixed
    {
        $this->entityManager->beginTransaction();

        try {
            $result = $callback();
            $this->entityManager->flush();
            $this->entityManager->commit();

            return $result;
        } catch (\Throwable $exception) {
            $this->entityManager->rollback();

            throw $exception;
        }
    }
}
