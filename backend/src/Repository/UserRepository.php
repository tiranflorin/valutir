<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    /**
     * @return User[]
     */
    public function findWithRemindersEnabled(): array
    {
        return $this->findBy(['remindersEnabled' => true], ['id' => 'ASC']);
    }

    /**
     * Atomically marks the user's reminders as handled for $localDate. Returns false when another
     * run already handled that day, so overlapping runs never send the same digest twice.
     */
    public function claimReminderRun(User $user, \DateTimeImmutable $localDate): bool
    {
        $updated = $this->createQueryBuilder('u')
            ->update()
            ->set('u.remindersProcessedOn', ':localDate')
            ->andWhere('u.id = :id')
            ->andWhere('u.remindersProcessedOn IS NULL OR u.remindersProcessedOn < :localDate')
            ->setParameter('localDate', $localDate, 'date_immutable')
            ->setParameter('id', $user->getId())
            ->getQuery()
            ->execute();

        return 1 === $updated;
    }

    /** Undoes claimReminderRun() after a failed send, so the next run retries the user. */
    public function releaseReminderRun(User $user, ?\DateTimeImmutable $previous): void
    {
        $this->createQueryBuilder('u')
            ->update()
            ->set('u.remindersProcessedOn', ':previous')
            ->andWhere('u.id = :id')
            ->setParameter('previous', $previous, 'date_immutable')
            ->setParameter('id', $user->getId())
            ->getQuery()
            ->execute();
    }
}
