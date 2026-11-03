<?php

declare(strict_types=1);

namespace App\Payment;

use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class StripeCheckoutGateway implements CheckoutGateway
{
    /** Only these hosts may be handed to the browser as a checkout URL. */
    private const string CHECKOUT_ORIGIN = 'https://checkout.stripe.com';

    private ?StripeClient $client = null;

    public function __construct(
        #[Autowire('%stripe_secret_key%')] private readonly string $secretKey,
    ) {
    }

    public function isConfigured(): bool
    {
        return '' !== $this->secretKey;
    }

    public function createSession(array $params, string $idempotencyKey): CheckoutSession
    {
        try {
            $session = $this->client()->checkout->sessions->create($params, ['idempotency_key' => $idempotencyKey]);
        } catch (ApiErrorException $e) {
            throw new PaymentProviderException(sprintf('Stripe rejected the checkout session (%s, request %s).', $e->getStripeCode() ?? $e::class, $e->getRequestId() ?? 'n/a'), 0, $e);
        }

        $url = (string) $session->url;
        if (!str_starts_with($url, self::CHECKOUT_ORIGIN.'/')) {
            throw new PaymentProviderException('Stripe returned an unexpected checkout URL.');
        }

        return new CheckoutSession((string) $session->id, $url);
    }

    public function expireSession(string $sessionId): void
    {
        try {
            $this->client()->checkout->sessions->expire($sessionId);
        } catch (ApiErrorException $e) {
            throw new PaymentProviderException(sprintf('Stripe could not expire the checkout session (%s).', $e->getStripeCode() ?? $e::class), 0, $e);
        }
    }

    private function client(): StripeClient
    {
        if (!$this->isConfigured()) {
            throw new PaymentProviderException('Stripe is not configured (STRIPE_SECRET_KEY is empty).');
        }

        return $this->client ??= new StripeClient([
            'api_key' => $this->secretKey,
            'max_network_retries' => 2,
        ]);
    }
}
