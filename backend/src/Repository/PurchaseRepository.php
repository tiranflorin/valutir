<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Purchase;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Purchase>
 */
class PurchaseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Purchase::class);
    }

    /**
     * Locks the row (SELECT ... FOR UPDATE) so duplicate webhook deliveries are applied one at a time.
     * Call inside a transaction.
     */
    public function findOneByCheckoutSessionIdForUpdate(string $sessionId): ?Purchase
    {
        return $this->findOneForUpdate('stripeCheckoutSessionId', $sessionId);
    }

    /**
     * @see findOneByCheckoutSessionIdForUpdate()
     */
    public function findOneByPaymentIntentIdForUpdate(string $paymentIntentId): ?Purchase
    {
        return $this->findOneForUpdate('stripePaymentIntentId', $paymentIntentId);
    }

    /**
     * The user's purchases, oldest first (for the user's own data export).
     *
     * @return Purchase[]
     */
    public function findByUserForExport(User $user): array
    {
        return $this->findBy(['user' => $user], ['createdAt' => 'ASC', 'id' => 'ASC']);
    }

    /**
     * @return Purchase[]
     */
    public function findPendingForUser(User $user): array
    {
        return $this->findBy(['user' => $user, 'status' => Purchase::STATUS_PENDING]);
    }

    public function hasOtherPaidPurchase(User $user, Purchase $except): bool
    {
        return null !== $this->createQueryBuilder('p')
            ->select('p.id')
            ->andWhere('p.user = :user')
            ->andWhere('p.status = :paid')
            ->andWhere('p.id <> :except')
            ->setParameter('user', $user)
            ->setParameter('paid', Purchase::STATUS_PAID)
            ->setParameter('except', $except->getId())
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @param 'stripeCheckoutSessionId'|'stripePaymentIntentId' $field
     */
    private function findOneForUpdate(string $field, string $value): ?Purchase
    {
        return $this->createQueryBuilder('p')
            ->andWhere(sprintf('p.%s = :value', $field))
            ->setParameter('value', $value)
            ->getQuery()
            ->setLockMode(LockMode::PESSIMISTIC_WRITE)
            ->getOneOrNullResult();
    }

    /**
     * @return array<string, int> purchase count per status
     */
    public function countByStatus(): array
    {
        $rows = $this->createQueryBuilder('p')
            ->select('p.status AS status, COUNT(p.id) AS purchases')
            ->groupBy('p.status')
            ->getQuery()
            ->getArrayResult();

        $counts = [];
        foreach ($rows as $row) {
            $counts[(string) $row['status']] = (int) $row['purchases'];
        }

        return $counts;
    }

    /**
     * What paid purchases still bring in (refunded and disputed ones excluded), VAT included,
     * before Stripe's fees.
     *
     * @return array<string, int> amount in cents per currency
     */
    public function sumPaidByCurrency(): array
    {
        $rows = $this->createQueryBuilder('p')
            ->select('p.currency AS currency, SUM(p.amountInCents) AS cents')
            ->andWhere('p.status = :paid')
            ->setParameter('paid', Purchase::STATUS_PAID)
            ->groupBy('p.currency')
            ->getQuery()
            ->getArrayResult();

        $totals = [];
        foreach ($rows as $row) {
            $totals[strtoupper((string) $row['currency'])] = (int) $row['cents'];
        }

        return $totals;
    }

    /**
     * Checkouts still pending that started before $before. Sessions expire after 30 minutes and Stripe
     * then sends checkout.session.expired, so these mean the webhook that settles them hasn't arrived.
     *
     * @return array{count: int, oldest: ?\DateTimeImmutable}
     */
    public function findStalePendingSummary(\DateTimeImmutable $before): array
    {
        $row = $this->createQueryBuilder('p')
            ->select('COUNT(p.id) AS pending, MIN(p.createdAt) AS oldest')
            ->andWhere('p.status = :pending')
            ->andWhere('p.createdAt < :before')
            ->setParameter('pending', Purchase::STATUS_PENDING)
            ->setParameter('before', $before)
            ->getQuery()
            ->getSingleResult();

        return [
            'count' => (int) $row['pending'],
            'oldest' => null === $row['oldest'] ? null : new \DateTimeImmutable((string) $row['oldest']),
        ];
    }
}
