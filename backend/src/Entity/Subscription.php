<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SubscriptionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SubscriptionRepository::class)]
#[ORM\Table(name: 'subscription')]
#[ORM\HasLifecycleCallbacks]
class Subscription
{
    /**
     * active and trial are charged; paused isn't (no reminders, not in totals) until it resumes;
     * cancelled is set only through the cancel flow.
     */
    public const array STATUSES = ['active', 'trial', 'paused', 'cancelled'];
    public const string STATUS_PAUSED = 'paused';
    public const string STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    private ?string $serviceName = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    #[Assert\NotNull]
    #[Assert\PositiveOrZero]
    private ?string $amount = null;

    #[ORM\Column(length: 3)]
    #[Assert\NotBlank]
    #[Assert\Currency]
    private ?string $currency = null;

    #[ORM\Column(length: 20)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['weekly', 'monthly', 'quarterly', 'yearly'])]
    private ?string $billingCadence = null;

    #[ORM\Column(length: 20)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: self::STATUSES)]
    private ?string $status = null;

    /** Paused only: the day it becomes active again (the hourly command resumes it); null = until changed. */
    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $resumesOn = null;

    /**
     * When the owner flagged it to decide whether to keep it; null when not flagged. A flag, not a
     * status: a flagged subscription is still charged and reminded as before.
     */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reviewFlaggedAt = null;

    /** The owner's note on why it needs a review. */
    #[ORM\Column(length: 500, nullable: true)]
    #[Assert\Length(max: 500)]
    private ?string $reviewNote = null;

    /**
     * Where the owner manages or cancels it with the provider (an https link). Only ever shown as a
     * link; the server never fetches it.
     */
    #[ORM\Column(length: 2048, nullable: true)]
    #[Assert\Length(max: 2048)]
    private ?string $manageUrl = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Assert\Length(max: 100)]
    private ?string $category = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $startedAt = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $nextBillingDate = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $trialEndsAt = null;

    /** When the trial-ending reminder was sent (server-owned timestamp). */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $trialReminderSentAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Assert\Length(max: 100)]
    private ?string $paymentMethod = null;

    #[ORM\Column(nullable: true)]
    private ?bool $autoRenew = true;

    #[ORM\Column(options: ['default' => false])]
    private bool $b2b = false;

    /** Whether the bill is split equally within the household (personal subscriptions only). */
    #[ORM\Column(options: ['default' => false])]
    private bool $householdShared = false;

    /** People splitting the bill equally, the owner included (2-10); null when not shared. */
    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    private ?int $householdSize = null;

    /** Calendar date of the cancellation; the API reads and writes it as Y-m-d. */
    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $cancelledAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column(nullable: true)]
    private ?bool $deletedUseful = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $now = new \DateTimeImmutable();
        $this->createdAt ??= $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getServiceName(): ?string
    {
        return $this->serviceName;
    }

    public function setServiceName(string $serviceName): static
    {
        $this->serviceName = $serviceName;

        return $this;
    }

    public function getAmount(): ?string
    {
        return $this->amount;
    }

    public function setAmount(string $amount): static
    {
        $this->amount = $amount;

        return $this;
    }

    public function getCurrency(): ?string
    {
        return $this->currency;
    }

    public function setCurrency(string $currency): static
    {
        $this->currency = strtoupper($currency);

        return $this;
    }

    public function getBillingCadence(): ?string
    {
        return $this->billingCadence;
    }

    public function setBillingCadence(string $billingCadence): static
    {
        $this->billingCadence = strtolower($billingCadence);

        return $this;
    }

    public function getCategory(): ?string
    {
        return $this->category;
    }

    public function setCategory(?string $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getStartedAt(): ?\DateTimeImmutable
    {
        return $this->startedAt;
    }

    public function setStartedAt(?\DateTimeImmutable $startedAt): static
    {
        $this->startedAt = $startedAt;

        return $this;
    }

    public function getNextBillingDate(): ?\DateTimeImmutable
    {
        return $this->nextBillingDate;
    }

    public function setNextBillingDate(?\DateTimeImmutable $nextBillingDate): static
    {
        $this->nextBillingDate = $nextBillingDate;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }

    public function getPaymentMethod(): ?string
    {
        return $this->paymentMethod;
    }

    public function setPaymentMethod(?string $paymentMethod): static
    {
        $this->paymentMethod = $paymentMethod;

        return $this;
    }

    public function isActive(): ?bool
    {
        return 'active' === $this->status;
    }

    public function isAutoRenew(): ?bool
    {
        return $this->autoRenew;
    }

    public function setAutoRenew(?bool $autoRenew): static
    {
        $this->autoRenew = $autoRenew;

        return $this;
    }

    public function isB2b(): bool
    {
        return $this->b2b;
    }

    public function setB2b(bool $b2b): static
    {
        $this->b2b = $b2b;

        return $this;
    }

    public function isHouseholdShared(): bool
    {
        return $this->householdShared;
    }

    public function getHouseholdSize(): ?int
    {
        return $this->householdSize;
    }

    /**
     * Shares the bill equally between $people (the owner included), or stops sharing when null.
     * One setter keeps the two fields consistent.
     */
    public function setHouseholdSharing(?int $people): static
    {
        $this->householdShared = null !== $people;
        $this->householdSize = $people;

        return $this;
    }

    public function getCancelledAt(): ?\DateTimeImmutable
    {
        return $this->cancelledAt;
    }

    public function setCancelledAt(?\DateTimeImmutable $cancelledAt): static
    {
        $this->cancelledAt = $cancelledAt;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getDeletedUseful(): ?bool
    {
        return $this->deletedUseful;
    }

    public function setDeletedUseful(?bool $deletedUseful): static
    {
        $this->deletedUseful = $deletedUseful;

        return $this;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function setDeletedAt(?\DateTimeImmutable $deletedAt): static
    {
        $this->deletedAt = $deletedAt;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): void
    {
        $this->status = $status;
    }

    public function getResumesOn(): ?\DateTimeImmutable
    {
        return $this->resumesOn;
    }

    public function setResumesOn(?\DateTimeImmutable $resumesOn): static
    {
        $this->resumesOn = $resumesOn;

        return $this;
    }

    public function getManageUrl(): ?string
    {
        return $this->manageUrl;
    }

    public function setManageUrl(?string $manageUrl): static
    {
        $manageUrl = null !== $manageUrl ? trim($manageUrl) : null;
        $this->manageUrl = '' === $manageUrl ? null : $manageUrl;

        return $this;
    }

    public function isReviewFlagged(): bool
    {
        return null !== $this->reviewFlaggedAt;
    }

    public function getReviewFlaggedAt(): ?\DateTimeImmutable
    {
        return $this->reviewFlaggedAt;
    }

    public function getReviewNote(): ?string
    {
        return $this->reviewNote;
    }

    /** Flags it for review (keeping the first flag date when already flagged) with an optional note. */
    public function flagForReview(\DateTimeImmutable $at, ?string $note): static
    {
        $this->reviewFlaggedAt ??= $at;
        $note = null !== $note ? trim($note) : null;
        $this->reviewNote = '' === $note ? null : $note;

        return $this;
    }

    public function clearReviewFlag(): static
    {
        $this->reviewFlaggedAt = null;
        $this->reviewNote = null;

        return $this;
    }

    public function getTrialEndsAt(): ?\DateTimeImmutable
    {
        return $this->trialEndsAt;
    }

    public function setTrialEndsAt(?\DateTimeImmutable $trialEndsAt): void
    {
        $this->trialEndsAt = $trialEndsAt;
    }

    public function getTrialReminderSentAt(): ?\DateTimeImmutable
    {
        return $this->trialReminderSentAt;
    }

    public function setTrialReminderSentAt(?\DateTimeImmutable $trialReminderSentAt): void
    {
        $this->trialReminderSentAt = $trialReminderSentAt;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'serviceName' => $this->getServiceName(),
            'amount' => $this->getAmount(),
            'currency' => $this->getCurrency(),
            'status' => $this->getStatus(),
            'billingCadence' => $this->getBillingCadence(),
            'category' => $this->getCategory(),
            'startedAt' => $this->getStartedAt()?->format('Y-m-d'),
            'nextBillingDate' => $this->getNextBillingDate()?->format('Y-m-d'),
            'notes' => $this->getNotes(),
            'paymentMethod' => $this->getPaymentMethod(),
            'manageUrl' => $this->getManageUrl(),
            'isActive' => $this->isActive(),
            'autoRenew' => $this->isAutoRenew(),
            'b2b' => $this->isB2b(),
            'householdShared' => $this->isHouseholdShared(),
            'householdSize' => $this->getHouseholdSize(),
            'cancelledAt' => $this->getCancelledAt()?->format('Y-m-d'),
            'createdAt' => $this->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updatedAt' => $this->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            'trialEndsAt' => $this->getTrialEndsAt()?->format('Y-m-d'),
            'trialReminderSentAt' => $this->getTrialReminderSentAt()?->format(\DateTimeInterface::ATOM),
            'resumesOn' => $this->getResumesOn()?->format('Y-m-d'),
            'reviewFlagged' => $this->isReviewFlagged(),
            'reviewFlaggedAt' => $this->getReviewFlaggedAt()?->format(\DateTimeInterface::ATOM),
            'reviewNote' => $this->getReviewNote(),
        ];
    }
}
