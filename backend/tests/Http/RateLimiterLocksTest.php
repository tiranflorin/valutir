<?php

declare(strict_types=1);

namespace App\Tests\Http;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Lock\Store\DoctrineDbalPostgreSqlStore;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Yaml\Yaml;

/**
 * A limiter reads its counter, changes it, and writes it back. Without a lock, parallel requests all
 * read the same count and all get through (20 parallel sign-ups passed a limit of 5 locally). Every
 * limiter therefore locks its key with a PostgreSQL advisory lock shared by all backend instances.
 */
final class RateLimiterLocksTest extends KernelTestCase
{
    private const string LOCK_FACTORY = 'app.rate_limiter.lock_factory';

    public function testEveryConfiguredLimiterUsesTheSharedLock(): void
    {
        $limiters = $this->config('framework.yaml')['framework']['rate_limiter'];
        self::assertNotEmpty($limiters);
        foreach ($limiters as $name => $limiter) {
            self::assertSame(self::LOCK_FACTORY, $limiter['lock_factory'] ?? null, \sprintf('Rate limiter "%s" must set lock_factory.', $name));
        }

        $throttled = 0;
        foreach ($this->config('security.yaml')['security']['firewalls'] as $name => $firewall) {
            if (isset($firewall['login_throttling'])) {
                ++$throttled;
                self::assertSame(self::LOCK_FACTORY, $firewall['login_throttling']['lock_factory'] ?? null, \sprintf('Login throttling on firewall "%s" must set lock_factory.', $name));
            }
        }
        self::assertGreaterThan(0, $throttled);
    }

    public function testOutsideTestsTheLocksArePostgresqlAdvisoryLocks(): void
    {
        $store = $this->config('services.yaml')['services']['app.rate_limiter.lock_store'];

        self::assertSame(DoctrineDbalPostgreSqlStore::class, $store['class']);
        self::assertSame(['@doctrine.dbal.default_connection'], $store['arguments']);
    }

    public function testTheLimiterServicesAreWiredToTheLock(): void
    {
        self::bootKernel();
        $container = static::getContainer();
        $lockFactory = $container->get(self::LOCK_FACTORY);

        foreach (['limiter.registration', 'limiter.password_reset_submit', 'limiter._login_local_login', 'limiter._login_global_login'] as $id) {
            $limiter = $container->get($id);
            self::assertInstanceOf(RateLimiterFactory::class, $limiter);
            self::assertSame($lockFactory, (new \ReflectionProperty(RateLimiterFactory::class, 'lockFactory'))->getValue($limiter), $id);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function config(string $file): array
    {
        $path = \dirname(__DIR__, 2).'/config/'.('services.yaml' === $file ? '' : 'packages/').$file;

        return Yaml::parseFile($path);
    }
}
