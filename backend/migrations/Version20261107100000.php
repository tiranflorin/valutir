<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261107100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Subscriptions: the link where the owner manages or cancels it with the provider.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD manage_url VARCHAR(2048) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription DROP manage_url');
    }
}
