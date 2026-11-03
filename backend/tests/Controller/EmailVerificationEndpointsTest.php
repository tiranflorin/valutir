<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Requests rejected before any database access. Verification behavior is covered by
 * EmailVerificationServiceTest.
 */
final class EmailVerificationEndpointsTest extends WebTestCase
{
    public function testResendingTheLinkRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/profile/email/verification', server: ['CONTENT_TYPE' => 'application/json']);

        self::assertResponseStatusCodeSame(401);
    }

    public function testVerifyingIsPublicAndRejectsMalformedTokens(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/register/verify-email', server: ['CONTENT_TYPE' => 'application/json'], content: '{"token":"not-a-token"}');

        self::assertResponseStatusCodeSame(422);
        $body = json_decode((string) $client->getResponse()->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('token', $body['errors']);
    }

    public function testVerifyingRejectsMalformedJson(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/register/verify-email', server: ['CONTENT_TYPE' => 'application/json'], content: '{not json');

        self::assertResponseStatusCodeSame(400);
    }

    public function testVerifyingIsRateLimited(): void
    {
        $client = static::createClient();
        $limiter = static::getContainer()->get('limiter.email_verification_confirm')->create(hash('sha256', '127.0.0.1'));
        self::assertTrue($limiter->consume(10)->isAccepted());

        $client->request('POST', '/api/register/verify-email', server: ['CONTENT_TYPE' => 'application/json'], content: '{"token":"x"}');

        self::assertResponseStatusCodeSame(429);
        self::assertResponseHasHeader('Retry-After');
    }
}
