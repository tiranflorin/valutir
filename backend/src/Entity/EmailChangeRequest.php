<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EmailChangeRequestRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * A pending email change. Only the SHA-256 hash of the confirmation token is stored.
 */
#[ORM\Entity(repositoryClass: EmailChangeRequestRepository::class)]
#[ORM\Table(name: 'email_change_request')]
#[ORM\UniqueConstraint(name: 'UNIQ_EMAIL_CHANGE_REQUEST_USER', fields: ['user'])]
#[ORM\UniqueConstraint(name: 'UNIQ_EMAIL_CHANGE_REQUEST_TOKEN_HASH', fields: ['tokenHash'])]
class EmailChangeRequest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 180)]
    private string $newEmail;

    #[ORM\Column(length: 64)]
    private string $tokenHash;

    #[ORM\Column]
    private \DateTimeImmutable $expiresAt;

    public function __construct(User $user, string $newEmail, string $tokenHash, \DateTimeImmutable $expiresAt)
    {
        $this->user = $user;
        $this->newEmail = User::normalizeEmail($newEmail);
        $this->tokenHash = $tokenHash;
        $this->expiresAt = $expiresAt;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getNewEmail(): string
    {
        return $this->newEmail;
    }

    public function getTokenHash(): string
    {
        return $this->tokenHash;
    }

    public function getExpiresAt(): \DateTimeImmutable
    {
        return $this->expiresAt;
    }
}
