<?php

declare(strict_types=1);

namespace App\Service;

use App\Clock\Clock;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Proves a new account's owner controls its email address. The link carries a random token;
 * only its SHA-256 hash is stored, it expires after 24 hours, and only the latest one works.
 *
 * Until verified, an account can sign in and track subscriptions, but it can't pay and gets no
 * reminder emails, so nobody can make ValuTir charge or email an address they don't own.
 */
final readonly class EmailVerificationService
{
    public const int TOKEN_TTL_SECONDS = 86400;

    public function __construct(
        private UserRepository $userRepository,
        private EntityManagerInterface $entityManager,
        private AccountMailer $accountMailer,
        private Clock $clock,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Issues a new link (invalidating earlier ones) and emails it. Does nothing for a verified address.
     */
    public function sendVerification(User $user): void
    {
        if ($user->isEmailVerified()) {
            return;
        }

        $rawToken = bin2hex(random_bytes(32));
        $user->setEmailVerificationToken(
            hash('sha256', $rawToken),
            $this->clock->now()->modify(sprintf('+%d seconds', self::TOKEN_TTL_SECONDS)),
        );
        $this->entityManager->flush();

        $this->logger->info('Email verification link sent.', ['user_id' => $user->getId()]);
        $this->accountMailer->sendEmailVerification($user->getUserIdentifier(), $rawToken);
    }

    /**
     * @return bool false when the token is malformed, unknown, already used, or expired
     */
    public function verify(string $rawToken): bool
    {
        if (1 !== preg_match('/\A[a-f0-9]{64}\z/', $rawToken)) {
            return false;
        }

        $user = $this->userRepository->findOneByEmailVerificationTokenHash(hash('sha256', $rawToken));
        $now = $this->clock->now();
        if (null === $user || !$user->isEmailVerificationTokenValid($now)) {
            return false;
        }

        $user->markEmailVerified($now);
        $this->entityManager->flush();
        $this->logger->info('Email address verified.', ['user_id' => $user->getId()]);

        return true;
    }
}
