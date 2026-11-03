<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PurchaseRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * One Stripe Checkout attempt for the one-time unlock. The row is created before the customer is sent
 * to Stripe, so a webhook can only ever settle a session this server created. Amount and currency are
 * the server's own values; the webhook checks Stripe's figures against them.
 *
 * The user link is SET NULL on account deletion: the payment trail (Stripe IDs, amount, status) stays
 * for bookkeeping and refunds without keeping any personal data here.
 */
#[ORM\Entity(repositoryClass: PurchaseRepository::class)]
#[ORM\Table(name: 'purchase')]
#[ORM\UniqueConstraint(name: 'UNIQ_PURCHASE_CHECKOUT_SESSION', fields: ['stripeCheckoutSessionId'])]
#[ORM\UniqueConstraint(name: 'UNIQ_PURCHASE_PAYMENT_INTENT', fields: ['stripePaymentIntentId'])]
#[ORM\Index(name: 'IDX_PURCHASE_USER_STATUS', fields: ['user', 'status'])]
class Purchase
{
    /** Created; the customer may still be on Stripe Checkout, or an async payment is in flight. */
    public const string STATUS_PENDING = 'pending';
    public const string STATUS_PAID = 'paid';
    public const string STATUS_FAILED = 'failed';
    public const string STATUS_EXPIRED = 'expired';
    public const string STATUS_REFUNDED = 'refunded';
    public const string STATUS_DISPUTED = 'disputed';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $user;

    #[ORM\Column(length: 32)]
    private string $product;

    #[ORM\Column(length: 255)]
    private string $stripeCheckoutSessionId;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $stripePaymentIntentId = null;

    /** In cents (1999 = €19.99), tax included, as Stripe counts it. */
    #[ORM\Column]
    private int $amountInCents;

    /** Lowercase ISO 4217, as Stripe reports it (e.g. "eur"). */
    #[ORM\Column(length: 3)]
    private string $currency;

    #[ORM\Column(length: 16)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $paidAt = null;

    /** When a paid purchase was refunded or disputed. */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $revokedAt = null;

    public function __construct(
        User $user,
        string $product,
        string $stripeCheckoutSessionId,
        int $amountInCents,
        string $currency,
        \DateTimeImmutable $createdAt,
    ) {
        $this->user = $user;
        $this->product = $product;
        $this->stripeCheckoutSessionId = $stripeCheckoutSessionId;
        $this->amountInCents = $amountInCents;
        $this->currency = strtolower($currency);
        $this->createdAt = $createdAt;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function getProduct(): string
    {
        return $this->product;
    }

    public function getStripeCheckoutSessionId(): string
    {
        return $this->stripeCheckoutSessionId;
    }

    public function getStripePaymentIntentId(): ?string
    {
        return $this->stripePaymentIntentId;
    }

    public function setStripePaymentIntentId(?string $paymentIntentId): void
    {
        $this->stripePaymentIntentId ??= $paymentIntentId;
    }

    public function getAmountInCents(): int
    {
        return $this->amountInCents;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function isPending(): bool
    {
        return self::STATUS_PENDING === $this->status;
    }

    public function isPaid(): bool
    {
        return self::STATUS_PAID === $this->status;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getPaidAt(): ?\DateTimeImmutable
    {
        return $this->paidAt;
    }

    public function getRevokedAt(): ?\DateTimeImmutable
    {
        return $this->revokedAt;
    }

    public function markPaid(\DateTimeImmutable $at): void
    {
        if (!$this->isPending()) {
            return;
        }
        $this->status = self::STATUS_PAID;
        $this->paidAt = $at;
    }

    /** A pending checkout that will never be paid (expired session or failed async payment). */
    public function markUnpaid(string $status): void
    {
        if (!\in_array($status, [self::STATUS_FAILED, self::STATUS_EXPIRED], true)) {
            throw new \InvalidArgumentException(sprintf('"%s" is not an unpaid status.', $status));
        }
        if ($this->isPending()) {
            $this->status = $status;
        }
    }

    /** A paid purchase whose money went back to the customer (refund or dispute). */
    public function revoke(string $status, \DateTimeImmutable $at): void
    {
        if (!\in_array($status, [self::STATUS_REFUNDED, self::STATUS_DISPUTED], true)) {
            throw new \InvalidArgumentException(sprintf('"%s" is not a revoked status.', $status));
        }
        if (!$this->isPaid()) {
            return;
        }
        $this->status = $status;
        $this->revokedAt = $at;
    }
}
