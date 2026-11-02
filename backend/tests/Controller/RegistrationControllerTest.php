<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Covers request handling that is rejected before any database access.
 * The registration flow itself is covered by UserRegistrationServiceTest.
 */
final class RegistrationControllerTest extends WebTestCase
{
    public function testMalformedJsonIsRejected(): void
    {
        $client = static::createClient();
        $this->postRegister($client, '{not json');

        self::assertResponseStatusCodeSame(400);
        self::assertSame(['message' => 'Invalid JSON payload.'], $this->json($client));
    }

    public function testNonStringFieldIsRejected(): void
    {
        $client = static::createClient();
        $this->postRegister($client, json_encode(['email' => 123, 'password' => 'Str0ng-pass', 'name' => 'Ada'], JSON_THROW_ON_ERROR));

        self::assertResponseStatusCodeSame(400);
    }

    public function testInvalidFieldsReturnFieldErrors(): void
    {
        $client = static::createClient();
        $this->postRegister($client, json_encode([
            'email' => 'not-an-email',
            'password' => 'password',
            'name' => '   ',
        ], JSON_THROW_ON_ERROR));

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
        $this->postRegister($client, json_encode([
            'email' => str_repeat('a', 175).'@example.test',
            'password' => 'Str0ng-pass',
            'name' => 'Ada',
        ], JSON_THROW_ON_ERROR));

        self::assertResponseStatusCodeSame(422);
        self::assertArrayHasKey('email', $this->json($client)['errors']);
    }

    public function testRequestsOverTheLimitAreRejected(): void
    {
        $client = static::createClient();
        // The test client sends requests from 127.0.0.1; exhaust that client's allowance (5 per window).
        $limiter = static::getContainer()->get('limiter.registration')->create(hash('sha256', '127.0.0.1'));
        self::assertTrue($limiter->consume(5)->isAccepted());

        $this->postRegister($client, '{}');

        self::assertResponseStatusCodeSame(429);
        self::assertResponseHasHeader('Retry-After');
        self::assertSame(['message' => 'Too many registration attempts. Please try again later.'], $this->json($client));
    }

    private function postRegister(KernelBrowser $client, string $content): void
    {
        $client->request('POST', '/api/register', server: ['CONTENT_TYPE' => 'application/json'], content: $content);
    }

    /**
     * @return array<string, mixed>
     */
    private function json(KernelBrowser $client): array
    {
        return json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }
}
