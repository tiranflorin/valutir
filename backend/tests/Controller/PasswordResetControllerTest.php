<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * POST /api/reset-password/new: input that is rejected before any database access.
 * Token lookup and the password change are covered by PasswordResetServiceTest.
 */
final class PasswordResetControllerTest extends WebTestCase
{
    private const string VALID_TOKEN_SHAPE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    public function testWeakPasswordIsRejectedWithThePasswordPolicyMessage(): void
    {
        $client = static::createClient();
        $this->postNewPassword($client, ['token' => self::VALID_TOKEN_SHAPE, 'newPassword' => 'password1']);

        self::assertResponseStatusCodeSame(422);
        self::assertSame(
            ['Use a password with at least 8 characters, plus any two of: an uppercase letter, a number, or a symbol.'],
            $this->json($client)['errors']['newPassword'],
        );
    }

    public function testSevenCharacterPasswordIsRejectedEvenWithThreeCharacterClasses(): void
    {
        $client = static::createClient();
        $this->postNewPassword($client, ['token' => self::VALID_TOKEN_SHAPE, 'newPassword' => 'Ab1!xyz']);

        self::assertResponseStatusCodeSame(422);
        self::assertArrayHasKey('newPassword', $this->json($client)['errors']);
    }

    public function testMalformedTokenGetsTheGenericInvalidLinkMessage(): void
    {
        $client = static::createClient();
        $this->postNewPassword($client, ['token' => 'not-a-token', 'newPassword' => 'Str0ng-pass']);

        self::assertResponseStatusCodeSame(422);
        self::assertSame(['The password reset link is invalid or expired.'], $this->json($client)['errors']['token']);
    }

    public function testMalformedJsonAndNonStringFieldsAreRejected(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/reset-password/new', server: ['CONTENT_TYPE' => 'application/json'], content: '{not json');
        self::assertResponseStatusCodeSame(400);

        $this->postNewPassword($client, ['token' => self::VALID_TOKEN_SHAPE, 'newPassword' => 12345678]);
        self::assertResponseStatusCodeSame(400);
    }

    public function testRequestsOverTheLimitAreRejected(): void
    {
        $client = static::createClient();
        // The test client sends requests from 127.0.0.1; exhaust that client's allowance (10 per window).
        $limiter = static::getContainer()->get('limiter.password_reset_submit')->create(hash('sha256', '127.0.0.1'));
        self::assertTrue($limiter->consume(10)->isAccepted());

        $this->postNewPassword($client, ['token' => self::VALID_TOKEN_SHAPE, 'newPassword' => 'Str0ng-pass']);

        self::assertResponseStatusCodeSame(429);
        self::assertResponseHasHeader('Retry-After');
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function postNewPassword(KernelBrowser $client, array $payload): void
    {
        $client->request(
            'POST',
            '/api/reset-password/new',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode($payload, JSON_THROW_ON_ERROR),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function json(KernelBrowser $client): array
    {
        return json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }
}
