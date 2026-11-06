<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Tests\Payment\StripeWebhookVerifierTest;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * The public Stripe webhook endpoint (authentication of the other billing endpoints is in ApiAccessTest).
 * Signature rules are covered by StripeWebhookVerifierTest, and what each event does by StripeWebhookHandlerTest.
 */
final class BillingControllerTest extends WebTestCase
{
    private const string VAR = 'STRIPE_WEBHOOK_SECRET';
    private const string SECRET = 'whsec_test_secret';

    protected function setUp(): void
    {
        $_SERVER[self::VAR] = $_ENV[self::VAR] = self::SECRET;
    }

    protected function tearDown(): void
    {
        unset($_SERVER[self::VAR], $_ENV[self::VAR]);
        parent::tearDown();
    }

    public function testTheWebhookRejectsAForgedSignature(): void
    {
        $payload = '{"id":"evt_1","object":"event","type":"checkout.session.completed","data":{"object":{"id":"cs_test_1","object":"checkout.session","payment_status":"paid"}}}';
        $client = static::createClient();
        $client->request('POST', '/api/billing/webhook', server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => StripeWebhookVerifierTest::sign($payload, time(), 'whsec_attacker'),
        ], content: $payload);

        self::assertResponseStatusCodeSame(400);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testTheWebhookAcknowledgesASignedEventItDoesNotHandle(): void
    {
        $payload = '{"id":"evt_1","object":"event","type":"customer.created","data":{"object":{"id":"cus_1","object":"customer"}}}';
        $client = static::createClient();
        $client->request('POST', '/api/billing/webhook', server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => StripeWebhookVerifierTest::sign($payload, time(), self::SECRET),
        ], content: $payload);

        self::assertResponseIsSuccessful();
    }

    public function testTheWebhookRejectsOversizedBodies(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/billing/webhook', server: ['CONTENT_TYPE' => 'application/json'], content: str_repeat('x', 300000));

        self::assertResponseStatusCodeSame(413);
    }
}
