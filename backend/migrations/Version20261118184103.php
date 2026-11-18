<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261118184103 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Custom reminder timing: how many days before each charge a subscription is reminded (null = the default).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD reminder_lead_days SMALLINT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription DROP reminder_lead_days');
    }
}
