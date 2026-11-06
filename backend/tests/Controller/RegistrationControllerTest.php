<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Registration input rejected before any database access (authentication, rate limits and malformed
 * JSON are in ApiAccessTest). The registration flow itself is covered by UserRegistrationServiceTest.
 */
final class RegistrationControllerTest extends WebTestCase
{
    public function testInvalidFieldsReturnFieldErrors(): void
    {
        $client = static::createClient();
        $this->postRegister($client, [
            'email' => 'not-an-email',
            'password' => 'password',
            'name' => '   ',
        ]);

        self::assertResponseStatusCodeSame(422);
        $body = $this->json($client);
        self::assertSame('Validation failed.', $body['message']);
        self::assertArrayHasKey('email', $body['errors']);
        self::assertArrayHasKey('password', $body['errors']);
        self::assertArrayHasKey('name', $body['errors']);
    }

    public function testOverlongEmailIsRejected(): void
    {
        $client = static::createClient();
        $this->postRegister($client, [
            'email' => str_repeat('a', 175).'@example.test',
            'password' => 'Str0ng-pass',
            'name' => 'Ada',
        ]);

        self::assertResponseStatusCodeSame(422);
        self::assertArrayHasKey('email', $this->json($client)['errors']);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function postRegister(KernelBrowser $client, array $payload): void
    {
        $client->request('POST', '/api/register', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode($payload, \JSON_THROW_ON_ERROR));
    }

    /**
     * @return array<string, mixed>
     */
    private function json(KernelBrowser $client): array
    {
        return json_decode((string) $client->getResponse()->getContent(), true, 512, \JSON_THROW_ON_ERROR);
    }
}
