<?php

declare(strict_types=1);

namespace App\Tests\Payment;

use App\Payment\InvalidWebhookException;
use App\Payment\StripeWebhookVerifier;
use PHPUnit\Framework\TestCase;

final class StripeWebhookVerifierTest extends TestCase
{
    private const string SECRET = 'whsec_test_secret';
    private const string PAYLOAD = '{"id":"evt_1","object":"event","type":"checkout.session.completed","data":{"object":{"id":"cs_test_1","object":"checkout.session"}}}';

    public function testAcceptsAPayloadSignedWithTheEndpointSecret(): void
    {
        $event = (new StripeWebhookVerifier(self::SECRET))->verify(self::PAYLOAD, self::sign(self::PAYLOAD, time()));

        self::assertSame('evt_1', $event->id);
        self::assertSame('checkout.session.completed', $event->type);
    }

    public function testRejectsASignatureMadeWithAnotherSecret(): void
    {
        $this->expectException(InvalidWebhookException::class);

        (new StripeWebhookVerifier(self::SECRET))->verify(self::PAYLOAD, self::sign(self::PAYLOAD, time(), 'whsec_attacker'));
    }

    public function testRejectsATamperedBody(): void
    {
        $signature = self::sign(self::PAYLOAD, time());
        $this->expectException(InvalidWebhookException::class);

        (new StripeWebhookVerifier(self::SECRET))->verify(str_replace('cs_test_1', 'cs_test_2', self::PAYLOAD), $signature);
    }

    public function testRejectsAReplayedOldDelivery(): void
    {
        $this->expectException(InvalidWebhookException::class);

        (new StripeWebhookVerifier(self::SECRET))->verify(self::PAYLOAD, self::sign(self::PAYLOAD, time() - 600));
    }

    public function testRejectsAMissingSignature(): void
    {
        $this->expectException(InvalidWebhookException::class);

        (new StripeWebhookVerifier(self::SECRET))->verify(self::PAYLOAD, null);
    }

    public function testRejectsEverythingWhenNoSecretIsConfigured(): void
    {
        $verifier = new StripeWebhookVerifier('');
        self::assertFalse($verifier->isConfigured());
        $this->expectException(InvalidWebhookException::class);

        // Even a "signature" made with the empty secret must not pass.
        $verifier->verify(self::PAYLOAD, self::sign(self::PAYLOAD, time(), ''));
    }

    public static function sign(string $payload, int $timestamp, string $secret = self::SECRET): string
    {
        return sprintf('t=%d,v1=%s', $timestamp, hash_hmac('sha256', $timestamp.'.'.$payload, $secret));
    }
}
