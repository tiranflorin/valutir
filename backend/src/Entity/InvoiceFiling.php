<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\InvoiceFilingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * The owner's tick that the invoice for one business charge is filed (saved, or sent to the
 * accountant). Only the tick is kept, never the invoice itself.
 */
#[ORM\Entity(repositoryClass: InvoiceFilingRepository::class)]
#[ORM\Table(name: 'invoice_filing')]
#[ORM\UniqueConstraint(name: 'UNIQ_INVOICE_FILING_CHARGE', fields: ['subscription', 'chargeDate'])]
class InvoiceFiling
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Subscription::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Subscription $subscription;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $chargeDate;

    #[ORM\Column]
    private \DateTimeImmutable $filedAt;

    public function __construct(Subscription $subscription, \DateTimeImmutable $chargeDate, \DateTimeImmutable $filedAt)
    {
        $this->subscription = $subscription;
        $this->chargeDate = $chargeDate;
        $this->filedAt = $filedAt;
    }

    public function getSubscription(): Subscription
    {
        return $this->subscription;
    }

    public function getChargeDate(): \DateTimeImmutable
    {
        return $this->chargeDate;
    }

    public function getFiledAt(): \DateTimeImmutable
    {
        return $this->filedAt;
    }
}
