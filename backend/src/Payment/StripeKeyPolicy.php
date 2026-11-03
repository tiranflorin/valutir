<?php

declare(strict_types=1);

namespace App\Payment;

/**
 * Keeps live money out of development and test keys out of a live deployment. STRIPE_MODE states
 * which Stripe environment this deployment is meant for, and the secret key has to belong to it:
 *
 * - "test": only test keys (sk_test_ / rk_test_). Any machine, including staging on APP_ENV=prod.
 * - "live": only live keys (sk_live_ / rk_live_), and only with APP_ENV=prod.
 *
 * A key that breaks the policy turns checkout off; it is never sent to Stripe.
 */
final class StripeKeyPolicy
{
    public const string MODE_TEST = 'test';
    public const string MODE_LIVE = 'live';

    private function __construct()
    {
    }

    /**
     * @return string|null why the key may not be used, or null when it may
     */
    public static function problem(string $secretKey, string $mode, string $appEnv): ?string
    {
        if (!\in_array($mode, [self::MODE_TEST, self::MODE_LIVE], true)) {
            return 'STRIPE_MODE must be "test" or "live".';
        }
        if (self::MODE_LIVE === $mode && 'prod' !== $appEnv) {
            return sprintf('STRIPE_MODE=live is only allowed with APP_ENV=prod (this is APP_ENV=%s).', $appEnv);
        }
        if ('' === $secretKey) {
            return 'STRIPE_SECRET_KEY is empty.';
        }

        $keyMode = self::keyMode($secretKey);
        if (null === $keyMode) {
            return 'STRIPE_SECRET_KEY is not a Stripe secret or restricted key (sk_… / rk_…).';
        }
        if ($keyMode !== $mode) {
            return sprintf('STRIPE_SECRET_KEY is a %s key but STRIPE_MODE=%s.', $keyMode, $mode);
        }

        return null;
    }

    /**
     * "test" or "live" from the key's prefix; null for anything else (including publishable pk_ keys).
     */
    private static function keyMode(string $secretKey): ?string
    {
        if (1 !== preg_match('/^(?:sk|rk)_(test|live)_[A-Za-z0-9]+$/', $secretKey, $matches)) {
            return null;
        }

        return $matches[1];
    }
}
