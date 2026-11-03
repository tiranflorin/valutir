<?php

declare(strict_types=1);

namespace App\Tests\Http;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Yaml\Yaml;

/**
 * Revoked JWTs and rate-limit counters must survive deploys (a new container has an empty
 * filesystem) and be shared by every backend instance, so outside tests they live in PostgreSQL.
 */
final class PersistentCachePoolsTest extends KernelTestCase
{
    private const array PERSISTENT_POOLS = ['cache.jwt_blocklist', 'cache.rate_limiter'];

    public function testTheJwtBlocklistUsesItsDedicatedPool(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        self::assertSame(
            $container->get('cache.jwt_blocklist'),
            $container->get('lexik_jwt_authentication.blocklist_token.cache'),
        );
    }

    public function testRevocationAndRateLimitStateIsStoredInTheDatabaseOutsideTests(): void
    {
        $config = Yaml::parseFile(\dirname(__DIR__, 2).'/config/packages/cache.yaml');
        $pools = $config['framework']['cache']['pools'] ?? [];

        foreach (self::PERSISTENT_POOLS as $pool) {
            self::assertSame('cache.adapter.doctrine_dbal', $pools[$pool]['adapter'] ?? null, $pool);
        }
    }
}
