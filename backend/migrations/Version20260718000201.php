<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260718000201 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD trial_ends_at DATE DEFAULT NULL');
        $this->addSql('ALTER TABLE subscription ADD trial_reminder_sent_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql("ALTER TABLE subscription ADD status varchar(20) NOT NULL DEFAULT 'active'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "subscription" DROP status');
        $this->addSql('ALTER TABLE "subscription" DROP trial_ends_at');
        $this->addSql('ALTER TABLE "subscription" DROP trial_reminder_sent_at');
    }
}
