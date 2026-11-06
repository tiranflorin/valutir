<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * POST /api/reset-password/new: the messages a user sees for input rejected before any database access
 * (rate limits and malformed JSON are in ApiAccessTest; every password rule is in PasswordPolicyValidatorTest).
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

    public function testMalformedTokenGetsTheGenericInvalidLinkMessage(): void
    {
        $client = static::createClient();
        $this->postNewPassword($client, ['token' => 'not-a-token', 'newPassword' => 'Str0ng-pass']);

        self::assertResponseStatusCodeSame(422);
        self::assertSame(['The password reset link is invalid or expired.'], $this->json($client)['errors']['token']);
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
            content: json_encode($payload, \JSON_THROW_ON_ERROR),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function json(KernelBrowser $client): array
    {
        return json_decode((string) $client->getResponse()->getContent(), true, 512, \JSON_THROW_ON_ERROR);
    }
}
