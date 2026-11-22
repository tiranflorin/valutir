<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Initial schema: the starting point of the application.
 *
 * Replaces the incremental migrations of 2 to 22 November 2026. Generated from the mapping with
 * doctrine:schema:create --dump-sql, plus the CHECK constraints Doctrine can't map, so
 * doctrine:schema:validate passes on a database created from it. Add schema changes as new
 * migrations after this one.
 */
final class Version20261122200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Initial schema: accounts, subscriptions and their history, reminders, invoice ticks, purchases, tokens, and the shared cache';
    }

    public function up(Schema $schema): void
    {
        // Accounts (emails lowercase, one account per email ignoring case)
        $this->addSql("CREATE TABLE \"user\" (id SERIAL NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, default_currency VARCHAR(3) DEFAULT 'EUR' NOT NULL, token_version INT DEFAULT 1 NOT NULL, timezone VARCHAR(64) DEFAULT 'Europe/Berlin' NOT NULL, reminders_enabled BOOLEAN DEFAULT true NOT NULL, reminders_processed_on DATE DEFAULT NULL, unlocked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, email_verified_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, email_verification_token_hash VARCHAR(64) DEFAULT NULL, email_verification_expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_IDENTIFIER_EMAIL ON "user" (email)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_USER_EMAIL_VERIFICATION_TOKEN ON "user" (email_verification_token_hash)');
        $this->addSql("COMMENT ON COLUMN \"user\".reminders_processed_on IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN \"user\".unlocked_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN \"user\".email_verified_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN \"user\".email_verification_expires_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN \"user\".created_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql('ALTER TABLE "user" ADD CONSTRAINT CHK_USER_EMAIL_LOWERCASE CHECK (email = LOWER(email))');

        // Subscriptions (soft-deleted through deleted_at)
        $this->addSql('CREATE TABLE subscription (id SERIAL NOT NULL, user_id INT NOT NULL, service_name VARCHAR(255) NOT NULL, amount NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL, billing_cadence VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, resumes_on DATE DEFAULT NULL, review_flagged_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, review_note VARCHAR(500) DEFAULT NULL, manage_url VARCHAR(2048) DEFAULT NULL, category VARCHAR(100) DEFAULT NULL, started_at DATE DEFAULT NULL, next_billing_date DATE DEFAULT NULL, trial_ends_at DATE DEFAULT NULL, notes TEXT DEFAULT NULL, auto_renew BOOLEAN DEFAULT true NOT NULL, b2b BOOLEAN DEFAULT false NOT NULL, reminder_lead_days SMALLINT DEFAULT NULL, paid_personally BOOLEAN DEFAULT false NOT NULL, household_shared BOOLEAN DEFAULT false NOT NULL, household_size SMALLINT DEFAULT NULL, cancelled_at DATE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, deleted_useful BOOLEAN DEFAULT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_A3C664D3A76ED395 ON subscription (user_id)');
        $this->addSql("COMMENT ON COLUMN subscription.resumes_on IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.review_flagged_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.started_at IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.next_billing_date IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.trial_ends_at IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.cancelled_at IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.created_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.updated_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN subscription.deleted_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("ALTER TABLE subscription ADD CONSTRAINT CHK_SUBSCRIPTION_STATUS CHECK (status IN ('active', 'trial', 'paused', 'cancelled'))");
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT CHK_SUBSCRIPTION_HOUSEHOLD CHECK ((household_shared AND household_size BETWEEN 2 AND 10) OR (NOT household_shared AND household_size IS NULL))');
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT CHK_SUBSCRIPTION_REMINDER_LEAD_DAYS CHECK (reminder_lead_days IS NULL OR reminder_lead_days BETWEEN 1 AND 30)');

        // Price history: the terms before each change the owner made
        $this->addSql('CREATE TABLE price_change (id SERIAL NOT NULL, subscription_id INT NOT NULL, previous_amount NUMERIC(10, 2) NOT NULL, previous_currency VARCHAR(3) NOT NULL, previous_cadence VARCHAR(20) NOT NULL, new_amount NUMERIC(10, 2) NOT NULL, new_currency VARCHAR(3) NOT NULL, new_cadence VARCHAR(20) NOT NULL, changed_on DATE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_PRICE_CHANGE_SUBSCRIPTION ON price_change (subscription_id)');
        $this->addSql("COMMENT ON COLUMN price_change.changed_on IS '(DC2Type:date_immutable)'");

        // Who paid a business subscription: the card before each switch
        $this->addSql('CREATE TABLE payer_change (id SERIAL NOT NULL, subscription_id INT NOT NULL, previous_paid_personally BOOLEAN NOT NULL, changed_on DATE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_PAYER_CHANGE_SUBSCRIPTION ON payer_change (subscription_id)');
        $this->addSql("COMMENT ON COLUMN payer_change.changed_on IS '(DC2Type:date_immutable)'");

        // Reminders sent: one per subscription, kind and charge date
        $this->addSql('CREATE TABLE reminder_log (id SERIAL NOT NULL, subscription_id INT NOT NULL, kind VARCHAR(20) NOT NULL, charge_date DATE NOT NULL, sent_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_C45D025B9A1887DC ON reminder_log (subscription_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_REMINDER_LOG_CHARGE ON reminder_log (subscription_id, kind, charge_date)');
        $this->addSql("COMMENT ON COLUMN reminder_log.charge_date IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN reminder_log.sent_at IS '(DC2Type:datetime_immutable)'");

        // Invoice checklist: the owner's "invoice filed" tick per business charge
        $this->addSql('CREATE TABLE invoice_filing (id SERIAL NOT NULL, subscription_id INT NOT NULL, charge_date DATE NOT NULL, filed_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_5E25CF4D9A1887DC ON invoice_filing (subscription_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_INVOICE_FILING_CHARGE ON invoice_filing (subscription_id, charge_date)');
        $this->addSql("COMMENT ON COLUMN invoice_filing.charge_date IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN invoice_filing.filed_at IS '(DC2Type:datetime_immutable)'");

        // Purchases (Stripe one-time unlock); kept for bookkeeping when the account is deleted
        $this->addSql('CREATE TABLE purchase (id SERIAL NOT NULL, user_id INT DEFAULT NULL, product VARCHAR(32) NOT NULL, stripe_checkout_session_id VARCHAR(255) NOT NULL, stripe_payment_intent_id VARCHAR(255) DEFAULT NULL, amount_in_cents INT NOT NULL, currency VARCHAR(3) NOT NULL, status VARCHAR(16) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, paid_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, revoked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_6117D13BA76ED395 ON purchase (user_id)');
        $this->addSql('CREATE INDEX IDX_PURCHASE_USER_STATUS ON purchase (user_id, status)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PURCHASE_CHECKOUT_SESSION ON purchase (stripe_checkout_session_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PURCHASE_PAYMENT_INTENT ON purchase (stripe_payment_intent_id)');
        $this->addSql("COMMENT ON COLUMN purchase.created_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN purchase.paid_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("COMMENT ON COLUMN purchase.revoked_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql("ALTER TABLE purchase ADD CONSTRAINT CHK_PURCHASE_STATUS CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded', 'disputed'))");
        $this->addSql('ALTER TABLE purchase ADD CONSTRAINT CHK_PURCHASE_AMOUNT CHECK (amount_in_cents > 0)');

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

        // Cache pools shared by every instance: the JWT blocklist and rate limiters
        $this->addSql('CREATE TABLE cache_items (item_id VARCHAR(255) NOT NULL, item_data BYTEA NOT NULL, item_lifetime INT DEFAULT NULL, item_time INT NOT NULL, PRIMARY KEY(item_id))');

        // Everything owned by an account or a subscription is deleted with it; purchases keep their row.
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3C664D3A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE price_change ADD CONSTRAINT FK_DCE56709A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE purchase ADD CONSTRAINT FK_6117D13BA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE email_change_request ADD CONSTRAINT FK_136F31FFA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE payer_change ADD CONSTRAINT FK_181034EA9A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE reminder_log ADD CONSTRAINT FK_C45D025B9A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE invoice_filing ADD CONSTRAINT FK_5E25CF4D9A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE password_reset_token ADD CONSTRAINT FK_6B7BA4B6A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE cache_items');
        $this->addSql('DROP TABLE email_change_request');
        $this->addSql('DROP TABLE password_reset_token');
        $this->addSql('DROP TABLE purchase');
        $this->addSql('DROP TABLE invoice_filing');
        $this->addSql('DROP TABLE reminder_log');
        $this->addSql('DROP TABLE payer_change');
        $this->addSql('DROP TABLE price_change');
        $this->addSql('DROP TABLE subscription');
        $this->addSql('DROP TABLE "user"');
    }
}
