<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * POST /api/reminders/unsubscribe is public; invalid tokens are rejected before any database access.
 */
final class ReminderUnsubscribeTest extends WebTestCase
{
    public function testRejectsMissingForgedAndMalformedTokens(): void
    {
        $client = static::createClient();
        foreach (['', '?token=not-a-token', '?token=1.'.str_repeat('a', 64)] as $query) {
            $client->request('POST', '/api/reminders/unsubscribe'.$query);

            self::assertResponseStatusCodeSame(400);
            self::assertSame(
                ['message' => 'This unsubscribe link is invalid.'],
                json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR),
            );
        }
    }

    public function testDoesNotChangeStateOnGet(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/reminders/unsubscribe?token=x');

        self::assertResponseStatusCodeSame(405);
    }
}
