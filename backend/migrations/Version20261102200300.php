<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Case-insensitive emails: a CHECK constraint keeps emails lowercase. Together with the
 * existing unique index on email, that allows only one account per address regardless of case.
 */
final class Version20261102200300 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Enforce lowercase emails (one account per email ignoring case)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD CONSTRAINT CHK_USER_EMAIL_LOWERCASE CHECK (email = LOWER(email))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP CONSTRAINT CHK_USER_EMAIL_LOWERCASE');
    }
}
