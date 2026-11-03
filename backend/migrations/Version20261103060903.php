<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Table for Symfony's Doctrine DBAL cache adapter (pools cache.jwt_blocklist and
 * cache.rate_limiter). Keeping revoked JWTs and rate-limit counters in PostgreSQL means they
 * survive deploys and are shared by every backend instance. Columns match DoctrineDbalAdapter.
 */
final class Version20261103060903 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create cache_items for the JWT blocklist and rate-limiter cache pools';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE cache_items (item_id VARCHAR(255) NOT NULL, item_data BYTEA NOT NULL, item_lifetime INT DEFAULT NULL, item_time INT NOT NULL, PRIMARY KEY(item_id))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE cache_items');
    }
}
