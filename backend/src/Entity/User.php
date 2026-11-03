<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[ORM\UniqueConstraint(name: 'UNIQ_USER_EMAIL_VERIFICATION_TOKEN', fields: ['emailVerificationTokenHash'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    public const string DEFAULT_CURRENCY = 'EUR';
    public const array SUPPORTED_CURRENCIES = ['EUR', 'USD', 'RON'];
    /** Default user time zone: Frankfurt, where the app is hosted (AWS eu-central-1). */
    public const string DEFAULT_TIMEZONE = 'Europe/Berlin';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private ?string $email = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string The hashed password
     */
    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(length: 3, options: ['default' => self::DEFAULT_CURRENCY])]
    private string $defaultCurrency = self::DEFAULT_CURRENCY;

    /**
     * Embedded in every JWT; bumping it revokes all previously issued tokens.
     */
    #[ORM\Column(options: ['default' => 1])]
    private int $tokenVersion = 1;

    /** IANA time zone used for "today" in reminders and billing-date updates. */
    #[ORM\Column(length: 64, options: ['default' => self::DEFAULT_TIMEZONE])]
    private string $timezone = self::DEFAULT_TIMEZONE;

    /** Payment reminder emails; on by default, turned off from Preferences or the email's unsubscribe link. */
    #[ORM\Column(options: ['default' => true])]
    private bool $remindersEnabled = true;

    /** The user's local date the reminder digest was last handled for (one digest per local day). */
    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $remindersProcessedOn = null;

    /**
     * When the one-time unlock was paid (lifts the free plan's active-subscription limit); null on the
     * free plan. Server-owned: set and cleared only by the verified Stripe webhook.
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $unlockedAt = null;

    /**
     * When the owner proved they control the address (verification link, password reset, or a
     * confirmed email change); null until then. Unverified accounts can't pay and get no reminders.
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $emailVerifiedAt = null;

    /** SHA-256 of the latest verification link's token; only the latest link works. */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $emailVerificationTokenHash = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $emailVerificationExpiresAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    /**
     * Stored and looked up in this form, so addresses are case-insensitive: "Ada@X.com" is "ada@x.com".
     * The database enforces it too (CHECK email = LOWER(email) plus the unique index).
     */
    public static function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    public function setEmail(string $email): static
    {
        $this->email = self::normalizeEmail($email);

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    /**
     * Ensure the session doesn't contain actual password hashes by CRC32C-hashing them, as supported since Symfony 7.3.
     */
    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0".self::class."\0password"] = hash('crc32c', (string) $this->password);

        return $data;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getDefaultCurrency(): string
    {
        return $this->defaultCurrency;
    }

    public function setDefaultCurrency(string $defaultCurrency): static
    {
        $this->defaultCurrency = $defaultCurrency;

        return $this;
    }

    public function getTokenVersion(): int
    {
        return $this->tokenVersion;
    }

    /**
     * Revokes every JWT issued so far ("sign out everywhere", password and email changes).
     */
    public function revokeAllTokens(): static
    {
        ++$this->tokenVersion;

        return $this;
    }

    public function getTimezone(): string
    {
        return $this->timezone;
    }

    public function setTimezone(string $timezone): static
    {
        $this->timezone = $timezone;

        return $this;
    }

    public function isRemindersEnabled(): bool
    {
        return $this->remindersEnabled;
    }

    public function setRemindersEnabled(bool $remindersEnabled): static
    {
        $this->remindersEnabled = $remindersEnabled;

        return $this;
    }

    public function getRemindersProcessedOn(): ?\DateTimeImmutable
    {
        return $this->remindersProcessedOn;
    }

    public function isUnlocked(): bool
    {
        return null !== $this->unlockedAt;
    }

    public function getUnlockedAt(): ?\DateTimeImmutable
    {
        return $this->unlockedAt;
    }

    public function unlock(\DateTimeImmutable $at): static
    {
        $this->unlockedAt ??= $at;

        return $this;
    }

    public function revokeUnlock(): static
    {
        $this->unlockedAt = null;

        return $this;
    }

    public function isEmailVerified(): bool
    {
        return null !== $this->emailVerifiedAt;
    }

    public function getEmailVerifiedAt(): ?\DateTimeImmutable
    {
        return $this->emailVerifiedAt;
    }

    /**
     * Replaces any earlier link: only the newest token can verify the address.
     */
    public function setEmailVerificationToken(string $tokenHash, \DateTimeImmutable $expiresAt): static
    {
        $this->emailVerificationTokenHash = $tokenHash;
        $this->emailVerificationExpiresAt = $expiresAt;

        return $this;
    }

    public function isEmailVerificationTokenValid(\DateTimeImmutable $now): bool
    {
        return null !== $this->emailVerificationTokenHash
            && null !== $this->emailVerificationExpiresAt
            && $this->emailVerificationExpiresAt > $now;
    }

    /** Also invalidates any outstanding verification link. */
    public function markEmailVerified(\DateTimeImmutable $at): static
    {
        $this->emailVerifiedAt ??= $at;
        $this->emailVerificationTokenHash = null;
        $this->emailVerificationExpiresAt = null;

        return $this;
    }

    /** Payment reminders only go to addresses the owner has proved are theirs. */
    public function canReceiveReminders(): bool
    {
        return $this->remindersEnabled && $this->isEmailVerified();
    }
}
