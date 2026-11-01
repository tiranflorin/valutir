<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add hashed password reset tokens with expiry';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE password_reset_token (id SERIAL NOT NULL, user_id INT NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PASSWORD_RESET_TOKEN_USER ON password_reset_token (user_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PASSWORD_RESET_TOKEN_HASH ON password_reset_token (token_hash)');
        $this->addSql('ALTER TABLE password_reset_token ADD CONSTRAINT FK_PASSWORD_RESET_TOKEN_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql("COMMENT ON COLUMN password_reset_token.expires_at IS '(DC2Type:datetime_immutable)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE password_reset_token');
    }
}
