<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261118104553 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Who paid a business subscription (the company or the owner\'s own card), with the dated history of switches.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE payer_change (id SERIAL NOT NULL, subscription_id INT NOT NULL, previous_paid_personally BOOLEAN NOT NULL, changed_on DATE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_PAYER_CHANGE_SUBSCRIPTION ON payer_change (subscription_id)');
        $this->addSql('COMMENT ON COLUMN payer_change.changed_on IS \'(DC2Type:date_immutable)\'');
        $this->addSql('ALTER TABLE payer_change ADD CONSTRAINT FK_181034EA9A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE subscription ADD paid_personally BOOLEAN DEFAULT false NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE payer_change DROP CONSTRAINT FK_181034EA9A1887DC');
        $this->addSql('DROP TABLE payer_change');
        $this->addSql('ALTER TABLE subscription DROP paid_personally');
    }
}
