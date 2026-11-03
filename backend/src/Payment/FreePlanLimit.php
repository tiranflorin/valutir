<?php

declare(strict_types=1);

namespace App\Payment;

use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\SubscriptionRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Free accounts may have at most 50 active (active or trial) subscriptions; the one-time unlock lifts it.
 * Records past the limit stay readable and editable; only a new active one, or making an inactive
 * one active again, is refused.
 */
final class FreePlanLimit
{
    public const int MAX_ACTIVE_SUBSCRIPTIONS = 50;
    /** Statuses that count towards the limit (the same ones the reminder commands treat as billable). */
    public const array COUNTED_STATUSES = ['active', 'trial'];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly SubscriptionRepository $subscriptionRepository,
    ) {
    }

    public function countActive(User $user): int
    {
        return $this->subscriptionRepository->countWithStatuses($user, self::COUNTED_STATUSES);
    }

    /**
     * Call inside a transaction, before saving. Locks the user's row while counting, so two
     * parallel requests can't both add the 50th subscription.
     *
     * @param Subscription|null $existing The subscription being updated, or null when creating one
     *
     * @throws HttpException 402 when the free limit is reached
     */
    public function assertCanSave(User $user, ?Subscription $existing, ?string $newStatus): void
    {
        if ($user->isUnlocked() || !$this->counts($newStatus)) {
            return;
        }
        if (null !== $existing && null === $existing->getDeletedAt() && $this->counts($existing->getStatus())) {
            return; // Already counted: editing it doesn't add one.
        }

        $this->entityManager->lock($user, LockMode::PESSIMISTIC_WRITE);

        if ($this->countActive($user) >= self::MAX_ACTIVE_SUBSCRIPTIONS) {
            throw new HttpException(402, sprintf('The free plan includes up to %d active subscriptions. Cancel one, or get the one-time unlock on the Plans page to add more.', self::MAX_ACTIVE_SUBSCRIPTIONS));
        }
    }

    private function counts(?string $status): bool
    {
        return \in_array($status, self::COUNTED_STATUSES, true);
    }
}
