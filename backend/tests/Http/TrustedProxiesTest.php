<?php

declare(strict_types=1);

namespace App\Tests\Http;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Rate limits and login throttling key on Request::getClientIp(): behind a proxy it must be the
 * visitor's address, and a client must never be able to choose it with a forged header.
 */
final class TrustedProxiesTest extends KernelTestCase
{
    private const string VAR = 'SYMFONY_TRUSTED_PROXIES';

    protected function tearDown(): void
    {
        unset($_SERVER[self::VAR], $_ENV[self::VAR]);
        Request::setTrustedProxies([], 0);
        parent::tearDown();
    }

    public function testWithoutTrustedProxiesForwardedHeadersAreIgnored(): void
    {
        self::bootKernel();

        self::assertSame('198.51.100.9', $this->clientIp('198.51.100.9', '203.0.113.7'));
    }

    public function testATrustedProxyPassesOnTheVisitorsAddressAndScheme(): void
    {
        $this->bootWithTrustedProxies('10.0.0.0/8');

        $request = $this->request('10.0.4.20', '203.0.113.7', 'https');

        self::assertSame('203.0.113.7', $request->getClientIp());
        self::assertTrue($request->isSecure());
    }

    public function testAForgedHeaderBeforeTheProxyIsIgnored(): void
    {
        // The client sent "X-Forwarded-For: 1.2.3.4"; the proxy appended the address it saw.
        $this->bootWithTrustedProxies('10.0.0.0/8');

        self::assertSame('203.0.113.7', $this->clientIp('10.0.4.20', '1.2.3.4, 203.0.113.7'));
    }

    public function testSkipsEveryTrustedHopInAChainOfProxies(): void
    {
        // Visitor -> Cloudflare edge (173.245.48.0/20) -> load balancer (10.0.0.0/8) -> PHP.
        $this->bootWithTrustedProxies('10.0.0.0/8,173.245.48.0/20');

        self::assertSame('203.0.113.7', $this->clientIp('10.0.4.20', '203.0.113.7, 173.245.48.5'));
    }

    public function testARequestFromAnUntrustedAddressCannotPickItsIp(): void
    {
        $this->bootWithTrustedProxies('10.0.0.0/8');

        self::assertSame('198.51.100.9', $this->clientIp('198.51.100.9', '203.0.113.7'));
    }

    public function testTheForwardedHostIsNotTrusted(): void
    {
        $this->bootWithTrustedProxies('10.0.0.0/8');
        $request = $this->request('10.0.4.20', '203.0.113.7');
        $request->headers->set('X-Forwarded-Host', 'evil.example');

        self::assertSame('api.valutir.test', $request->getHost());
    }

    private function bootWithTrustedProxies(string $proxies): void
    {
        $_SERVER[self::VAR] = $_ENV[self::VAR] = $proxies;
        self::bootKernel();
    }

    private function clientIp(string $remoteAddr, string $forwardedFor): ?string
    {
        return $this->request($remoteAddr, $forwardedFor)->getClientIp();
    }

    private function request(string $remoteAddr, string $forwardedFor, ?string $forwardedProto = null): Request
    {
        $server = ['REMOTE_ADDR' => $remoteAddr, 'HTTP_HOST' => 'api.valutir.test', 'HTTP_X_FORWARDED_FOR' => $forwardedFor];
        if (null !== $forwardedProto) {
            $server['HTTP_X_FORWARDED_PROTO'] = $forwardedProto;
        }

        return Request::create('/api/register', 'POST', server: $server);
    }
}
