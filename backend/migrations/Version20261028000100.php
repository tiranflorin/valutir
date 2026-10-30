<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261028000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add business classification to subscriptions';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD b2b BOOLEAN DEFAULT FALSE NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription DROP b2b');
    }
}
