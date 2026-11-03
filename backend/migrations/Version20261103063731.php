<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Stripe payments for the one-time unlock: a purchase row per Checkout session, and the account's
 * unlock timestamp. The CHECK constraints back up the entity's allowed statuses and positive amounts.
 */
final class Version20261103063731 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add purchase (Stripe one-time unlock) and user.unlocked_at';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE purchase (id SERIAL NOT NULL, user_id INT DEFAULT NULL, product VARCHAR(32) NOT NULL, stripe_checkout_session_id VARCHAR(255) NOT NULL, stripe_payment_intent_id VARCHAR(255) DEFAULT NULL, amount_in_cents INT NOT NULL, currency VARCHAR(3) NOT NULL, status VARCHAR(16) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, paid_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, revoked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_6117D13BA76ED395 ON purchase (user_id)');
        $this->addSql('CREATE INDEX IDX_PURCHASE_USER_STATUS ON purchase (user_id, status)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PURCHASE_CHECKOUT_SESSION ON purchase (stripe_checkout_session_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PURCHASE_PAYMENT_INTENT ON purchase (stripe_payment_intent_id)');
        $this->addSql('COMMENT ON COLUMN purchase.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN purchase.paid_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN purchase.revoked_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE purchase ADD CONSTRAINT FK_6117D13BA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql("ALTER TABLE purchase ADD CONSTRAINT CHK_PURCHASE_STATUS CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded', 'disputed'))");
        $this->addSql('ALTER TABLE purchase ADD CONSTRAINT CHK_PURCHASE_AMOUNT CHECK (amount_in_cents > 0)');
        $this->addSql('ALTER TABLE "user" ADD unlocked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN "user".unlocked_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE purchase DROP CONSTRAINT FK_6117D13BA76ED395');
        $this->addSql('DROP TABLE purchase');
        $this->addSql('ALTER TABLE "user" DROP unlocked_at');
    }
}
