<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261118095507 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Invoice checklist: the owner\'s "invoice filed" tick for each business charge.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE invoice_filing (id SERIAL NOT NULL, subscription_id INT NOT NULL, charge_date DATE NOT NULL, filed_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_5E25CF4D9A1887DC ON invoice_filing (subscription_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_INVOICE_FILING_CHARGE ON invoice_filing (subscription_id, charge_date)');
        $this->addSql('COMMENT ON COLUMN invoice_filing.charge_date IS \'(DC2Type:date_immutable)\'');
        $this->addSql('COMMENT ON COLUMN invoice_filing.filed_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE invoice_filing ADD CONSTRAINT FK_5E25CF4D9A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE invoice_filing DROP CONSTRAINT FK_5E25CF4D9A1887DC');
        $this->addSql('DROP TABLE invoice_filing');
    }
}
