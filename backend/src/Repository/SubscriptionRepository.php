<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Subscription;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Subscription>
 *
 * Subscriptions are soft-deleted (deletedAt is set) so cancellation feedback is kept
 * for reporting. Every user-facing query must go through createVisibleForUserQueryBuilder()
 * so deleted rows are never listed, read, updated, or deleted again through the API.
 *
 * TODO: Add an app:subscriptions:purge-deleted console command, run by cron, that archives
 *       or permanently removes subscriptions soft-deleted longer than a retention period.
 */
class SubscriptionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Subscription::class);
    }

    /**
     * @return Subscription[]
     */
    public function findByUser(User $user): array
    {
        return $this->createVisibleForUserQueryBuilder($user)
            ->orderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByIdAndUser(int $id, User $user): ?Subscription
    {
        return $this->createVisibleForUserQueryBuilder($user)
            ->andWhere('s.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * The user's subscriptions that can still be charged: active or trial, not deleted, and not set to stop renewing.
     *
     * @return Subscription[]
     */
    public function findBillableForUser(User $user): array
    {
        return $this->createVisibleForUserQueryBuilder($user)
            ->andWhere('s.status IN (:billableStatuses)')
            ->andWhere('s.autoRenew IS NULL OR s.autoRenew = true')
            ->setParameter('billableStatuses', ['active', 'trial'])
            ->orderBy('s.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @param list<string> $statuses
     */
    public function countWithStatuses(User $user, array $statuses): int
    {
        return (int) $this->createVisibleForUserQueryBuilder($user)
            ->select('COUNT(s.id)')
            ->andWhere('s.status IN (:statuses)')
            ->setParameter('statuses', $statuses)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Subscriptions owned by the user that have not been soft-deleted.
     */
    public function createVisibleForUserQueryBuilder(User $user): QueryBuilder
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.user = :user')
            ->andWhere('s.deletedAt IS NULL')
            ->setParameter('user', $user);
    }
}
