<?php

declare(strict_types=1);

namespace App\Payment;

/**
 * The one paid product: a one-time unlock, no renewal. Price and currency are fixed here on the server;
 * the client never sends an amount, and the webhook checks Stripe's figures against these values.
 */
final class UnlockOffer
{
    public const string PRODUCT = 'lifetime_unlock';
    public const string PRODUCT_NAME = 'ValuTir one-time unlock';
    public const string PRODUCT_DESCRIPTION = 'Track more than 50 active subscriptions. Pay once, no renewal.';

    /**
     * €19.99, VAT included. Stripe takes amounts in the currency's smallest unit (cents), so this is
     * 1999 cents, not 1999 euros. Tax-inclusive: Stripe Tax works out the VAT part of it.
     */
    public const int AMOUNT_IN_CENTS = 1999;
    public const string CURRENCY = 'eur';

    private function __construct()
    {
    }
}
