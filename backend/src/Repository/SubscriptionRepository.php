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
