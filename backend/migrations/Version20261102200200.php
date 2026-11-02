<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Payment reminders: per-user time zone and reminder settings, and a log of sent reminders.
 */
final class Version20261102200200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user time zone and reminder settings, and the reminder log';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE \"user\" ADD timezone VARCHAR(64) DEFAULT 'Europe/Berlin' NOT NULL");
        $this->addSql('ALTER TABLE "user" ADD reminders_enabled BOOLEAN DEFAULT true NOT NULL');
        $this->addSql('ALTER TABLE "user" ADD reminders_processed_on DATE DEFAULT NULL');
        $this->addSql("COMMENT ON COLUMN \"user\".reminders_processed_on IS '(DC2Type:date_immutable)'");

        $this->addSql('CREATE TABLE reminder_log (id SERIAL NOT NULL, subscription_id INT NOT NULL, kind VARCHAR(20) NOT NULL, charge_date DATE NOT NULL, sent_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_C45D025B9A1887DC ON reminder_log (subscription_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_REMINDER_LOG_CHARGE ON reminder_log (subscription_id, kind, charge_date)');
        $this->addSql("COMMENT ON COLUMN reminder_log.charge_date IS '(DC2Type:date_immutable)'");
        $this->addSql("COMMENT ON COLUMN reminder_log.sent_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql('ALTER TABLE reminder_log ADD CONSTRAINT FK_C45D025B9A1887DC FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE reminder_log');
        $this->addSql('ALTER TABLE "user" DROP reminders_processed_on');
        $this->addSql('ALTER TABLE "user" DROP reminders_enabled');
        $this->addSql('ALTER TABLE "user" DROP timezone');
    }
}
