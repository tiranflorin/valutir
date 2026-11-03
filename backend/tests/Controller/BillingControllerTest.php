<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Tests\Payment\StripeWebhookVerifierTest;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Billing requests rejected before any database access. Checkout and webhook behavior is covered
 * by the CheckoutService and StripeWebhookHandler tests.
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

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function protectedEndpoints(): iterable
    {
        yield 'billing status' => ['GET', '/api/billing'];
        yield 'start checkout' => ['POST', '/api/billing/checkout'];
    }

    #[DataProvider('protectedEndpoints')]
    public function testRequiresAuthentication(string $method, string $path): void
    {
        $client = static::createClient();
        $client->request($method, $path, server: ['CONTENT_TYPE' => 'application/json']);

        self::assertResponseStatusCodeSame(401);
    }

    public function testTheWebhookRejectsUnsignedRequests(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/billing/webhook', server: ['CONTENT_TYPE' => 'application/json'], content: $this->payload());

        self::assertResponseStatusCodeSame(400);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testTheWebhookRejectsAForgedSignature(): void
    {
        $payload = $this->payload();
        $client = static::createClient();
        $client->request('POST', '/api/billing/webhook', server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => StripeWebhookVerifierTest::sign($payload, time(), 'whsec_attacker'),
        ], content: $payload);

        self::assertResponseStatusCodeSame(400);
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

    private function payload(): string
    {
        return '{"id":"evt_1","object":"event","type":"checkout.session.completed","data":{"object":{"id":"cs_test_1","object":"checkout.session","payment_status":"paid"}}}';
    }
}
