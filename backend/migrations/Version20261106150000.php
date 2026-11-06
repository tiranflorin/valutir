<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Replaces the undefined "other" status: adds the paused status's resume date and a
 * review flag with a note. Existing "other" subscriptions, and any row with a blank or unknown
 * status, become active and flagged for review, so they keep counting in totals and their owners
 * decide what they are.
 */
final class Version20261106150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace the "other" subscription status with a review flag; add the paused resume date';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD resumes_on DATE DEFAULT NULL');
        $this->addSql('ALTER TABLE subscription ADD review_flagged_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE subscription ADD review_note VARCHAR(500) DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN subscription.resumes_on IS \'(DC2Type:date_immutable)\'');
        $this->addSql('COMMENT ON COLUMN subscription.review_flagged_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql(<<<'SQL'
            UPDATE subscription
            SET status = 'active',
                review_flagged_at = NOW(),
                review_note = 'This was saved without a clear status (the old "Other"). Is it still active, paused, or cancelled?'
            WHERE status IS NULL OR status NOT IN ('active', 'trial', 'paused', 'cancelled')
            SQL);
    }

    public function down(Schema $schema): void
    {
        // Paused has no older equivalent; "other" was the closest (not charged, not reminded).
        $this->addSql("UPDATE subscription SET status = 'other' WHERE status = 'paused'");
        $this->addSql('ALTER TABLE subscription DROP resumes_on');
        $this->addSql('ALTER TABLE subscription DROP review_flagged_at');
        $this->addSql('ALTER TABLE subscription DROP review_note');
    }
}
