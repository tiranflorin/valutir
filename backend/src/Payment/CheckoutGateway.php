<?php

declare(strict_types=1);

namespace App\Payment;

/**
 * The payment provider's hosted checkout. Card data never reaches this server.
 */
interface CheckoutGateway
{
    public function isConfigured(): bool;

    /**
     * Why checkout is off (missing key, or a key that doesn't match STRIPE_MODE), or null when it's on.
     * Safe to log: it names variables and modes, never key material.
     */
    public function configurationProblem(): ?string;

    /**
     * @param array<string, mixed> $params Provider parameters built by CheckoutService
     *
     * @throws PaymentProviderException
     */
    public function createSession(array $params, string $idempotencyKey): CheckoutSession;

    /**
     * Closes an open session so it can no longer be paid. Best effort: a session that is already
     * complete or expired raises PaymentProviderException.
     *
     * @throws PaymentProviderException
     */
    public function expireSession(string $sessionId): void;
}
