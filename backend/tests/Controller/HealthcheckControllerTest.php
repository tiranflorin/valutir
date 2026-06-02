<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class HealthcheckControllerTest extends WebTestCase
{
    public function testHealthcheckReturnsOkJson(): void
    {
        $client = static::createClient();
        $client->request('GET', '/health');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('content-type', 'application/json');

        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('oki', $payload['status']);
        self::assertSame('valutir', $payload['app']);
        self::assertArrayHasKey('php', $payload);
    }
}
