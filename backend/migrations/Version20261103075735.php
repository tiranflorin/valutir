<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Email verification for accounts: when the address was verified, plus the hash and expiry of the
 * latest verification link. Existing accounts start unverified (none exist in production yet); their
 * owners verify through the resend link, a password reset, or an email change.
 */
final class Version20261103075735 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add email verification to user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD email_verified_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD email_verification_token_hash VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD email_verification_expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN "user".email_verified_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN "user".email_verification_expires_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_USER_EMAIL_VERIFICATION_TOKEN ON "user" (email_verification_token_hash)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_USER_EMAIL_VERIFICATION_TOKEN');
        $this->addSql('ALTER TABLE "user" DROP email_verified_at');
        $this->addSql('ALTER TABLE "user" DROP email_verification_token_hash');
        $this->addSql('ALTER TABLE "user" DROP email_verification_expires_at');
    }
}
