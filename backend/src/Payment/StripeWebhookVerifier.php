<?php

declare(strict_types=1);

namespace App\Payment;

use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Turns a webhook request into a Stripe event only when its Stripe-Signature header is a valid
 * HMAC of the exact raw body under the endpoint's signing secret, and no older than five minutes
 * (replay protection). Anything else is rejected before a single field is read.
 */
final class StripeWebhookVerifier
{
    private const int TOLERANCE_SECONDS = 300;

    public function __construct(
        #[Autowire('%stripe_webhook_secret%')] private readonly string $signingSecret,
    ) {
    }

    public function isConfigured(): bool
    {
        return '' !== $this->signingSecret;
    }

    /**
     * @throws InvalidWebhookException
     */
    public function verify(string $payload, ?string $signatureHeader): Event
    {
        if (!$this->isConfigured()) {
            throw new InvalidWebhookException('Stripe webhooks are not configured (STRIPE_WEBHOOK_SECRET is empty).');
        }
        if (null === $signatureHeader || '' === $signatureHeader) {
            throw new InvalidWebhookException('Missing Stripe-Signature header.');
        }

        try {
            return Webhook::constructEvent($payload, $signatureHeader, $this->signingSecret, self::TOLERANCE_SECONDS);
        } catch (SignatureVerificationException) {
            throw new InvalidWebhookException('Invalid Stripe webhook signature.');
        } catch (\UnexpectedValueException) {
            throw new InvalidWebhookException('Invalid Stripe webhook payload.');
        }
    }
}
