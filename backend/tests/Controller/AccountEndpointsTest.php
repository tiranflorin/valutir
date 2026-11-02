<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Request handling that is rejected before any database access.
 * Account behavior is covered by the AccountService and EmailChangeService tests.
 */
final class AccountEndpointsTest extends WebTestCase
{
    /**
     * @return iterable<string, array{string, string}>
     */
    public static function protectedEndpoints(): iterable
    {
        yield 'read profile' => ['GET', '/api/profile'];
        yield 'update profile' => ['PATCH', '/api/profile'];
        yield 'delete account' => ['DELETE', '/api/profile'];
        yield 'change password' => ['PATCH', '/api/profile/password'];
        yield 'change email' => ['POST', '/api/profile/email'];
        yield 'logout' => ['POST', '/api/logout'];
        yield 'logout everywhere' => ['POST', '/api/logout/all'];
    }

    #[DataProvider('protectedEndpoints')]
    public function testRequiresAuthentication(string $method, string $path): void
    {
        $client = static::createClient();
        $client->request($method, $path, server: ['CONTENT_TYPE' => 'application/json'], content: '{}');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testConfirmEmailIsPublicAndRejectsMalformedTokens(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/profile/email/confirm', server: ['CONTENT_TYPE' => 'application/json'], content: '{"token":"not-a-token"}');

        self::assertResponseStatusCodeSame(422);
        $body = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('token', $body['errors']);
    }

    public function testConfirmEmailIsRateLimited(): void
    {
        $client = static::createClient();
        $limiter = static::getContainer()->get('limiter.email_change_confirm')->create(hash('sha256', '127.0.0.1'));
        self::assertTrue($limiter->consume(10)->isAccepted());

        $client->request('POST', '/api/profile/email/confirm', server: ['CONTENT_TYPE' => 'application/json'], content: '{"token":"x"}');

        self::assertResponseStatusCodeSame(429);
        self::assertResponseHasHeader('Retry-After');
    }
}
