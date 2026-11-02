<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\EmailChangeRequest;
use App\Entity\User;
use App\Repository\EmailChangeRequestRepository;
use App\Repository\UserRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Two-step email change: a link is sent to the new address, and the change only happens
 * once it is confirmed. Requests for an address that is already taken are silently dropped
 * so the API never reveals which emails are registered.
 */
final readonly class EmailChangeService
{
    private const int TOKEN_TTL_SECONDS = 86400;

    public function __construct(
        private EmailChangeRequestRepository $requestRepository,
        private UserRepository $userRepository,
        private EntityManagerInterface $entityManager,
        private AccountMailer $accountMailer,
        private LoggerInterface $logger,
    ) {
    }

    public function requestChange(User $user, string $newEmail): void
    {
        $newEmail = trim($newEmail);

        if (null !== $this->userRepository->findOneBy(['email' => $newEmail])) {
            $this->logger->info('Email change requested to an address that is already registered.', ['user_id' => $user->getId()]);

            return;
        }

        $rawToken = bin2hex(random_bytes(32));
        $this->transaction(function () use ($user, $newEmail, $rawToken): void {
            // Only the latest request is valid.
            $this->requestRepository->deleteForUser($user);
            $this->entityManager->persist(new EmailChangeRequest(
                $user,
                $newEmail,
                hash('sha256', $rawToken),
                new \DateTimeImmutable(sprintf('+%d seconds', self::TOKEN_TTL_SECONDS)),
            ));
        });

        $this->logger->info('Email change requested.', ['user_id' => $user->getId()]);
        $this->accountMailer->sendEmailChangeConfirmation($newEmail, $rawToken);
    }

    /**
     * Applies a pending change. Every existing JWT stops working, because tokens carry the
     * old email as their identity and are also revoked explicitly.
     *
     * @return bool false when the token is invalid or expired, or the address was taken meanwhile
     */
    public function confirmChange(string $rawToken): bool
    {
        try {
            $result = $this->transaction(function () use ($rawToken): ?array {
                $request = $this->requestRepository->findValidByTokenHash(hash('sha256', $rawToken), new \DateTimeImmutable());
                if (null === $request) {
                    return null;
                }

                $user = $request->getUser();
                $previousEmail = $user->getUserIdentifier();
                $this->entityManager->remove($request);

                if (null !== $this->userRepository->findOneBy(['email' => $request->getNewEmail()])) {
                    return null;
                }

                $user->setEmail($request->getNewEmail());
                $user->revokeAllTokens();

                return [$user, $previousEmail];
            });
        } catch (UniqueConstraintViolationException) {
            // The address was registered concurrently.
            return false;
        }

        if (null === $result) {
            return false;
        }

        [$user, $previousEmail] = $result;
        $this->logger->info('Account email changed.', ['user_id' => $user->getId()]);
        $this->accountMailer->sendEmailChangedNotice($previousEmail, $user->getUserIdentifier());

        return true;
    }

    /**
     * @template T
     *
     * @param callable(): T $callback
     *
     * @return T
     */
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
