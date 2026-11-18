<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261118190939 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop the payment method label: it was never shown in the app (the add form saved its "Provider group" text there).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription DROP payment_method');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD payment_method VARCHAR(100) DEFAULT NULL');
    }
}
