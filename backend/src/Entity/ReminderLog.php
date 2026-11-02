<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ReminderLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One reminder sent for one upcoming charge. The unique key makes sure a charge is never
 * reminded twice, even when its reminder window spans several days or a run is repeated.
 */
#[ORM\Entity(repositoryClass: ReminderLogRepository::class)]
#[ORM\Table(name: 'reminder_log')]
#[ORM\UniqueConstraint(name: 'UNIQ_REMINDER_LOG_CHARGE', fields: ['subscription', 'kind', 'chargeDate'])]
class ReminderLog
{
    public const string KIND_TRIAL_ENDING = 'trial_ending';
    public const string KIND_RENEWAL = 'renewal';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Subscription::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Subscription $subscription;

    #[ORM\Column(length: 20)]
    private string $kind;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $chargeDate;

    #[ORM\Column]
    private \DateTimeImmutable $sentAt;

    public function __construct(Subscription $subscription, string $kind, \DateTimeImmutable $chargeDate, \DateTimeImmutable $sentAt)
    {
        $this->subscription = $subscription;
        $this->kind = $kind;
        $this->chargeDate = $chargeDate;
        $this->sentAt = $sentAt;
    }

    public function getSubscription(): Subscription
    {
        return $this->subscription;
    }

    public function getKind(): string
    {
        return $this->kind;
    }

    public function getChargeDate(): \DateTimeImmutable
    {
        return $this->chargeDate;
    }

    public function getSentAt(): \DateTimeImmutable
    {
        return $this->sentAt;
    }
}
