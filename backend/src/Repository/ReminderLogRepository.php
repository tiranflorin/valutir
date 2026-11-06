<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ReminderLog;
use App\Entity\Subscription;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ReminderLog>
 */
class ReminderLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ReminderLog::class);
    }

    /**
     * Every reminder sent about the user's subscriptions, soft-deleted ones included, oldest first
     * (for the user's own data export).
     *
     * @return ReminderLog[]
     */
    public function findByUserForExport(User $user): array
    {
        return $this->createQueryBuilder('r')
            ->innerJoin('r.subscription', 's')
            ->andWhere('s.user = :user')
            ->setParameter('user', $user)
            ->orderBy('r.sentAt', 'ASC')
            ->addOrderBy('r.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Keys ("subscriptionId|kind|Y-m-d") of reminders already sent for charges on or after $from.
     *
     * @param Subscription[] $subscriptions
     *
     * @return array<string, true>
     */
    public function findSentKeys(array $subscriptions, \DateTimeImmutable $from): array
    {
        if ([] === $subscriptions) {
            return [];
        }

        $rows = $this->createQueryBuilder('log')
            ->select('IDENTITY(log.subscription) AS subscriptionId', 'log.kind', 'log.chargeDate')
            ->andWhere('log.subscription IN (:subscriptions)')
            ->andWhere('log.chargeDate >= :from')
            ->setParameter('subscriptions', $subscriptions)
            ->setParameter('from', $from, 'date_immutable')
            ->getQuery()
            ->getArrayResult();

        $keys = [];
        foreach ($rows as $row) {
            $keys[self::key((int) $row['subscriptionId'], $row['kind'], $row['chargeDate'])] = true;
        }

        return $keys;
    }

    /**
     * Records a sent reminder. A duplicate (same subscription, kind and charge date) is ignored.
     */
    public function recordSent(Subscription $subscription, string $kind, \DateTimeImmutable $chargeDate, \DateTimeImmutable $sentAt): void
    {
        $this->getEntityManager()->getConnection()->executeStatement(
            'INSERT INTO reminder_log (subscription_id, kind, charge_date, sent_at) VALUES (:subscription, :kind, :chargeDate, :sentAt)
             ON CONFLICT (subscription_id, kind, charge_date) DO NOTHING',
            [
                'subscription' => $subscription->getId(),
                'kind' => $kind,
                'chargeDate' => $chargeDate->format('Y-m-d'),
                'sentAt' => $sentAt->format('Y-m-d H:i:s'),
            ],
        );
    }

    public static function key(int $subscriptionId, string $kind, \DateTimeImmutable $chargeDate): string
    {
        return sprintf('%d|%s|%s', $subscriptionId, $kind, $chargeDate->format('Y-m-d'));
    }
}
