<?php

declare(strict_types=1);

namespace App\Payment;

/**
 * A call to the payment provider failed. The message is safe to log; it never holds keys or card data.
 */
final class PaymentProviderException extends \RuntimeException
{
}
