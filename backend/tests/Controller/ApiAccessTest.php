<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * HTTP-level guards shared by every API endpoint: authentication, rate limits, and input that is
 * rejected before any database access. The behavior behind each endpoint is covered by its service test.
 */
final class ApiAccessTest extends WebTestCase
{
    private const string VALID_TOKEN_SHAPE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function protectedEndpoints(): iterable
    {
        yield 'list subscriptions' => ['GET', '/api/subs'];
        yield 'create subscription' => ['POST', '/api/subs'];
        yield 'read subscription' => ['GET', '/api/subs/1'];
        yield 'replace subscription' => ['PUT', '/api/subs/1'];
        yield 'update subscription' => ['PATCH', '/api/subs/1'];
        yield 'delete subscription' => ['DELETE', '/api/subs/1'];
        yield 'read profile' => ['GET', '/api/profile'];
        yield 'update profile' => ['PATCH', '/api/profile'];
        yield 'delete account' => ['DELETE', '/api/profile'];
        yield 'change password' => ['PATCH', '/api/profile/password'];
        yield 'change email' => ['POST', '/api/profile/email'];
        yield 'resend verification link' => ['POST', '/api/profile/email/verification'];
        yield 'logout' => ['POST', '/api/logout'];
        yield 'logout everywhere' => ['POST', '/api/logout/all'];
        yield 'billing status' => ['GET', '/api/billing'];
        yield 'start checkout' => ['POST', '/api/billing/checkout'];
    }

    #[DataProvider('protectedEndpoints')]
    public function testRequiresAuthentication(string $method, string $path): void
    {
        $client = static::createClient();
        $this->send($client, $method, $path, '{}');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * @return iterable<string, array{string, int, string, string}>
     */
    public static function rateLimitedEndpoints(): iterable
    {
        // limiter, allowance per window, path, body
        yield 'registration' => ['limiter.registration', 5, '/api/register', '{}'];
        yield 'new password' => ['limiter.password_reset_submit', 10, '/api/reset-password/new', '{"token":"x","newPassword":"Str0ng-pass"}'];
        yield 'email verification' => ['limiter.email_verification_confirm', 10, '/api/register/verify-email', '{"token":"x"}'];
        yield 'email change confirmation' => ['limiter.email_change_confirm', 10, '/api/profile/email/confirm', '{"token":"x"}'];
    }

    #[DataProvider('rateLimitedEndpoints')]
    public function testPublicEndpointsAreRateLimitedPerClient(string $limiter, int $allowance, string $path, string $body): void
    {
        $client = static::createClient();
        // The test client sends requests from 127.0.0.1; exhaust that client's allowance.
        $limit = static::getContainer()->get($limiter)->create(hash('sha256', '127.0.0.1'));
        self::assertTrue($limit->consume($allowance)->isAccepted());

        $this->send($client, 'POST', $path, $body);

        self::assertResponseStatusCodeSame(429);
        self::assertResponseHasHeader('Retry-After');
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function emailLinkEndpoints(): iterable
    {
        yield 'email verification' => ['/api/register/verify-email'];
        yield 'email change confirmation' => ['/api/profile/email/confirm'];
    }

    #[DataProvider('emailLinkEndpoints')]
    public function testEmailLinksArePublicAndRejectMalformedTokens(string $path): void
    {
        $client = static::createClient();
        $this->send($client, 'POST', $path, '{"token":"not-a-token"}');

        self::assertResponseStatusCodeSame(422);
        self::assertArrayHasKey('token', $this->json($client)['errors']);
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function malformedBodies(): iterable
    {
        yield 'registration: broken JSON' => ['/api/register', '{not json'];
        yield 'registration: non-string email' => ['/api/register', '{"email":123,"password":"Str0ng-pass","name":"Ada"}'];
        yield 'new password: broken JSON' => ['/api/reset-password/new', '{not json'];
        yield 'new password: non-string password' => ['/api/reset-password/new', '{"token":"'.self::VALID_TOKEN_SHAPE.'","newPassword":12345678}'];
        yield 'email verification: broken JSON' => ['/api/register/verify-email', '{not json'];
    }

    #[DataProvider('malformedBodies')]
    public function testMalformedBodiesAreRejected(string $path, string $body): void
    {
        $client = static::createClient();
        $this->send($client, 'POST', $path, $body);

        self::assertResponseStatusCodeSame(400);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    private function send(KernelBrowser $client, string $method, string $path, string $body): void
    {
        $client->request($method, $path, server: ['CONTENT_TYPE' => 'application/json'], content: $body);
    }

    /**
     * @return array<string, mixed>
     */
    private function json(KernelBrowser $client): array
    {
        return json_decode((string) $client->getResponse()->getContent(), true, 512, \JSON_THROW_ON_ERROR);
    }
}
