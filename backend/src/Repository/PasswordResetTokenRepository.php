<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\PasswordResetToken;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<PasswordResetToken> */
class PasswordResetTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PasswordResetToken::class);
    }

    public function findValid(string $tokenHash, \DateTimeImmutable $now): ?PasswordResetToken
    {
        $query = $this->createQueryBuilder('token')
            ->andWhere('token.tokenHash = :tokenHash')
            ->andWhere('token.expiresAt > :now')
            ->setParameter('tokenHash', $tokenHash)
            ->setParameter('now', $now)
            ->getQuery();
        $query->setLockMode(LockMode::PESSIMISTIC_WRITE);

        return $query->getOneOrNullResult();
    }

    public function deleteForUser(User $user): void
    {
        $this->createQueryBuilder('token')
            ->delete()
            ->andWhere('token.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
