<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261115185451 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Price history: each change the owner makes to a subscription\'s amount, currency or cadence.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE price_change (id SERIAL NOT NULL, subscription_id INT NOT NULL, previous_amount NUMERIC(10, 2) NOT NULL, previous_currency VARCHAR(3) NOT NULL, previous_cadence VARCHAR(20) NOT NULL, new_amount NUMERIC(10, 2) NOT NULL, new_currency VARCHAR(3) NOT NULL, new_cadence VARCHAR(20) NOT NULL, changed_on DATE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_PRICE_CHANGE_SUBSCRIPTION ON price_change (subscription_id)');
        $this->addSql('COMMENT ON COLUMN price_change.changed_on IS \'(DC2Type:date_immutable)\'');
        $this->addSql('ALTER TABLE price_change ADD CONSTRAINT FK_DCE56709A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE price_change DROP CONSTRAINT FK_DCE56709A1887DC');
        $this->addSql('DROP TABLE price_change');
    }
}
