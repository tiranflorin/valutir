<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Account management: per-user default currency, JWT token version (revocation), and pending email changes.
 * Written by hand so it does not include the unrelated pre-existing subscription schema drift.
 */
final class Version20261102000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user default currency, token version, and email change requests';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE \"user\" ADD default_currency VARCHAR(3) DEFAULT 'EUR' NOT NULL");
        $this->addSql('ALTER TABLE "user" ADD token_version INT DEFAULT 1 NOT NULL');

        $this->addSql('CREATE TABLE email_change_request (id SERIAL NOT NULL, user_id INT NOT NULL, new_email VARCHAR(180) NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_EMAIL_CHANGE_REQUEST_USER ON email_change_request (user_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_EMAIL_CHANGE_REQUEST_TOKEN_HASH ON email_change_request (token_hash)');
        $this->addSql('ALTER TABLE email_change_request ADD CONSTRAINT FK_EMAIL_CHANGE_REQUEST_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql("COMMENT ON COLUMN email_change_request.expires_at IS '(DC2Type:datetime_immutable)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE email_change_request');
        $this->addSql('ALTER TABLE "user" DROP token_version');
        $this->addSql('ALTER TABLE "user" DROP default_currency');
    }
}
