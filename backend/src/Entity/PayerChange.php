<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One switch of the card a business subscription is paid with (the company's or the owner's own),
 * so earlier months keep who paid them. Recorded by Subscription::recordPayerChange(), never sent by the client.
 */
#[ORM\Entity]
#[ORM\Table(name: 'payer_change')]
#[ORM\Index(name: 'IDX_PAYER_CHANGE_SUBSCRIPTION', columns: ['subscription_id'])]
class PayerChange
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Subscription::class, inversedBy: 'payerChanges')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Subscription $subscription;

    /** Who paid before the switch: true for the owner's own card. */
    #[ORM\Column]
    private bool $previousPaidPersonally;

    /** The owner's local calendar day of the switch; charges from that day on follow the new card. */
    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $changedOn;

    public function __construct(Subscription $subscription, bool $previousPaidPersonally, \DateTimeImmutable $changedOn)
    {
        $this->subscription = $subscription;
        $this->previousPaidPersonally = $previousPaidPersonally;
        $this->changedOn = $changedOn;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function wasPaidPersonally(): bool
    {
        return $this->previousPaidPersonally;
    }

    public function getChangedOn(): \DateTimeImmutable
    {
        return $this->changedOn;
    }

    /**
     * @return array<string, bool|string>
     */
    public function toArray(): array
    {
        return [
            'previousPaidPersonally' => $this->previousPaidPersonally,
            'changedOn' => $this->changedOn->format('Y-m-d'),
        ];
    }
}
