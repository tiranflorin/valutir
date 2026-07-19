<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260712000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create subscription table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE subscription (
            id SERIAL NOT NULL,
            user_id INT NOT NULL,
            service_name VARCHAR(255) NOT NULL,
            amount NUMERIC(10, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            billing_cadence VARCHAR(20) NOT NULL,
            category VARCHAR(100) DEFAULT NULL,
            started_at DATE DEFAULT NULL,
            next_billing_date DATE DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            payment_method VARCHAR(100) DEFAULT NULL,
            auto_renew BOOLEAN DEFAULT TRUE,
            cancelled_at DATE DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE INDEX IDX_A3EF90EBA76ED395 ON subscription (user_id)');
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3EF90EBA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE subscription DROP CONSTRAINT FK_A3EF90EBA76ED395');
        $this->addSql('DROP TABLE subscription');
    }
}
