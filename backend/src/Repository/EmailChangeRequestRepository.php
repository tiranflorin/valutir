<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\EmailChangeRequest;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EmailChangeRequest>
 */
class EmailChangeRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmailChangeRequest::class);
    }

    public function findValidByTokenHash(string $tokenHash, \DateTimeImmutable $now): ?EmailChangeRequest
    {
        $query = $this->createQueryBuilder('request')
            ->andWhere('request.tokenHash = :tokenHash')
            ->andWhere('request.expiresAt > :now')
            ->setParameter('tokenHash', $tokenHash)
            ->setParameter('now', $now)
            ->getQuery();
        $query->setLockMode(LockMode::PESSIMISTIC_WRITE);

        return $query->getOneOrNullResult();
    }

    public function findPendingForUser(User $user, \DateTimeImmutable $now): ?EmailChangeRequest
    {
        return $this->createQueryBuilder('request')
            ->andWhere('request.user = :user')
            ->andWhere('request.expiresAt > :now')
            ->setParameter('user', $user)
            ->setParameter('now', $now)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function deleteForUser(User $user): void
    {
        $this->createQueryBuilder('request')
            ->delete()
            ->andWhere('request.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
