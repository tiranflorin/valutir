<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bridge\Doctrine\Security\User\UserLoaderInterface;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface, UserLoaderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /** Looks a user up by email, ignoring case and surrounding spaces. */
    public function findOneByEmail(string $email): ?User
    {
        return $this->findOneBy(['email' => User::normalizeEmail($email)]);
    }

    /**
     * Used by the security user provider (login and every JWT), so sign-in ignores email case.
     */
    public function loadUserByIdentifier(string $identifier): ?User
    {
        return $this->findOneByEmail($identifier);
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
     * Users with reminders on and a verified email (see User::canReceiveReminders()).
     *
     * @return User[]
     */
    public function findReminderRecipients(): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.remindersEnabled = true')
            ->andWhere('u.emailVerifiedAt IS NOT NULL')
            ->orderBy('u.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByEmailVerificationTokenHash(string $tokenHash): ?User
    {
        return $this->findOneBy(['emailVerificationTokenHash' => $tokenHash]);
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
