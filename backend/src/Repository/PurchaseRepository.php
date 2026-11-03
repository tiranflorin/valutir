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
}
