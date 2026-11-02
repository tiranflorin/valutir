<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Household sharing: a subscription's bill can be split equally between 2-10 people.
 */
final class Version20261102200100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add household sharing (shared flag and number of people splitting the bill) to subscriptions';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD household_shared BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('ALTER TABLE subscription ADD household_size SMALLINT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription DROP household_size');
        $this->addSql('ALTER TABLE subscription DROP household_shared');
    }
}
