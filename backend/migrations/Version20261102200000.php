<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Initial schema: the starting point of the application.
 *
 * Replaces the earlier incremental migrations (2026-06 to 2026-11), which had drifted from
 * the Doctrine mapping. Generated from the mapping with doctrine:schema:create --dump-sql,
 * so doctrine:schema:validate passes on a database created from it. Add schema changes as
 * new migrations after this one.
 */
final class Version20261102200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Initial schema: users, subscriptions, password reset tokens, and email change requests';
    }

    public function up(Schema $schema): void
    {
        // Users
        $this->addSql("CREATE TABLE \"user\" (id SERIAL NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, default_currency VARCHAR(3) DEFAULT 'EUR' NOT NULL, token_version INT DEFAULT 1 NOT NULL, PRIMARY KEY(id))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_IDENTIFIER_EMAIL ON "user" (email)');

        // Subscriptions (soft-deleted through deleted_at)
        $this->addSql('CREATE TABLE subscription (id SERIAL NOT NULL, user_id INT NOT NULL, service_name VARCHAR(255) NOT NULL, amount NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL, billing_cadence VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, category VARCHAR(100) DEFAULT NULL, started_at DATE DEFAULT NULL, next_billing_date DATE DEFAULT NULL, trial_ends_at DATE DEFAULT NULL, trial_reminder_sent_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, notes TEXT DEFAULT NULL, payment_method VARCHAR(100) DEFAULT NULL, auto_renew BOOLEAN DEFAULT NULL, b2b BOOLEAN DEFAULT false NOT NULL, cancelled_at DATE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, deleted_useful BOOLEAN DEFAULT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_A3C664D3A76ED395 ON subscription (user_id)');
        $this->addSql("COMMENT ON COLUMN subscription.started_at IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.next_billing_date IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.trial_ends_at IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.trial_reminder_sent_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.cancelled_at IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.created_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.updated_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.deleted_at IS '(DC2Type:datetime_immutable)'");

        // Password reset tokens (only the SHA-256 hash is stored)
        $this->addSql('CREATE TABLE password_reset_token (id SERIAL NOT NULL, user_id INT NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_6B7BA4B6B3BC57DA ON password_reset_token (token_hash)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PASSWORD_RESET_TOKEN_USER ON password_reset_token (user_id)');
        $this->addSql("COMMENT ON COLUMN password_reset_token.expires_at IS '(DC2Type:datetime_immutable)'");

        // Pending email changes (only the SHA-256 hash of the confirmation token is stored)
        $this->addSql('CREATE TABLE email_change_request (id SERIAL NOT NULL, user_id INT NOT NULL, new_email VARCHAR(180) NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_EMAIL_CHANGE_REQUEST_USER ON email_change_request (user_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_EMAIL_CHANGE_REQUEST_TOKEN_HASH ON email_change_request (token_hash)');
        $this->addSql("COMMENT ON COLUMN email_change_request.expires_at IS '(DC2Type:datetime_immutable)'");

        // Everything owned by a user is deleted with the account.
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3C664D3A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE password_reset_token ADD CONSTRAINT FK_6B7BA4B6A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE email_change_request ADD CONSTRAINT FK_136F31FFA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE email_change_request');
        $this->addSql('DROP TABLE password_reset_token');
        $this->addSql('DROP TABLE subscription');
        $this->addSql('DROP TABLE "user"');
    }
}
