<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\InvoiceFiling;
use App\Entity\Subscription;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<InvoiceFiling>
 */
class InvoiceFilingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, InvoiceFiling::class);
    }

    /**
     * Keys ("subscriptionId|Y-m-d") of the charges between $from and $to (inclusive) whose invoice is filed.
     *
     * @param Subscription[] $subscriptions
     *
     * @return array<string, true>
     */
    public function findFiledKeys(array $subscriptions, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        if ([] === $subscriptions) {
            return [];
        }

        $rows = $this->createQueryBuilder('filing')
            ->select('IDENTITY(filing.subscription) AS subscriptionId', 'filing.chargeDate')
            ->andWhere('filing.subscription IN (:subscriptions)')
            ->andWhere('filing.chargeDate BETWEEN :from AND :to')
            ->setParameter('subscriptions', $subscriptions)
            ->setParameter('from', $from, 'date_immutable')
            ->setParameter('to', $to, 'date_immutable')
            ->getQuery()
            ->getArrayResult();

        $keys = [];
        foreach ($rows as $row) {
            $keys[self::key((int) $row['subscriptionId'], $row['chargeDate'])] = true;
        }

        return $keys;
    }

    /** Ticks the charge's invoice as filed; ticking it again keeps the first time. */
    public function markFiled(Subscription $subscription, \DateTimeImmutable $chargeDate, \DateTimeImmutable $filedAt): void
    {
        $this->getEntityManager()->getConnection()->executeStatement(
            'INSERT INTO invoice_filing (subscription_id, charge_date, filed_at) VALUES (:subscription, :chargeDate, :filedAt)
             ON CONFLICT (subscription_id, charge_date) DO NOTHING',
            [
                'subscription' => $subscription->getId(),
                'chargeDate' => $chargeDate->format('Y-m-d'),
                'filedAt' => $filedAt->format('Y-m-d H:i:s'),
            ],
        );
    }

    public function unmarkFiled(Subscription $subscription, \DateTimeImmutable $chargeDate): void
    {
        $this->createQueryBuilder('filing')
            ->delete()
            ->andWhere('filing.subscription = :subscription')
            ->andWhere('filing.chargeDate = :chargeDate')
            ->setParameter('subscription', $subscription)
            ->setParameter('chargeDate', $chargeDate, 'date_immutable')
            ->getQuery()
            ->execute();
    }

    /**
     * Every tick on the user's subscriptions, soft-deleted ones included, oldest charge first
     * (for the user's own data export).
     *
     * @return InvoiceFiling[]
     */
    public function findByUserForExport(User $user): array
    {
        return $this->createQueryBuilder('filing')
            ->innerJoin('filing.subscription', 's')
            ->andWhere('s.user = :user')
            ->setParameter('user', $user)
            ->orderBy('filing.chargeDate', 'ASC')
            ->addOrderBy('filing.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public static function key(int $subscriptionId, \DateTimeImmutable $chargeDate): string
    {
        return sprintf('%d|%s', $subscriptionId, $chargeDate->format('Y-m-d'));
    }
}
