<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One change the owner made to what a subscription costs: its amount, currency or billing cadence.
 * Recorded by Subscription::recordPriceChange() when an edit changes them, never sent by the client.
 */
#[ORM\Entity]
#[ORM\Table(name: 'price_change')]
#[ORM\Index(name: 'IDX_PRICE_CHANGE_SUBSCRIPTION', columns: ['subscription_id'])]
class PriceChange
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Subscription::class, inversedBy: 'priceChanges')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Subscription $subscription;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $previousAmount;

    #[ORM\Column(length: 3)]
    private string $previousCurrency;

    #[ORM\Column(length: 20)]
    private string $previousCadence;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $newAmount;

    #[ORM\Column(length: 3)]
    private string $newCurrency;

    #[ORM\Column(length: 20)]
    private string $newCadence;

    /** The owner's local calendar day when they made the change. */
    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $changedOn;

    public function __construct(Subscription $subscription, PriceTerms $previous, PriceTerms $new, \DateTimeImmutable $changedOn)
    {
        $this->subscription = $subscription;
        $this->previousAmount = $previous->amount;
        $this->previousCurrency = $previous->currency;
        $this->previousCadence = $previous->cadence;
        $this->changeTo($new);
        $this->changedOn = $changedOn;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSubscription(): Subscription
    {
        return $this->subscription;
    }

    public function previous(): PriceTerms
    {
        return new PriceTerms($this->previousAmount, $this->previousCurrency, $this->previousCadence);
    }

    public function new(): PriceTerms
    {
        return new PriceTerms($this->newAmount, $this->newCurrency, $this->newCadence);
    }

    public function getChangedOn(): \DateTimeImmutable
    {
        return $this->changedOn;
    }

    /** A second edit on the same day replaces the first one's result. */
    public function changeTo(PriceTerms $new): void
    {
        $this->newAmount = $new->amount;
        $this->newCurrency = $new->currency;
        $this->newCadence = $new->cadence;
    }

    /**
     * @return array<string, int|string|null>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'previousAmount' => $this->previousAmount,
            'previousCurrency' => $this->previousCurrency,
            'previousCadence' => $this->previousCadence,
            'newAmount' => $this->newAmount,
            'newCurrency' => $this->newCurrency,
            'newCadence' => $this->newCadence,
            'changedOn' => $this->changedOn->format('Y-m-d'),
        ];
    }
}
