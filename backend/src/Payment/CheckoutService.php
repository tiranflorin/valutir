<?php

declare(strict_types=1);

namespace App\Payment;

use App\Clock\Clock;
use App\Entity\Purchase;
use App\Entity\User;
use App\Repository\PurchaseRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

/**
 * Starts a Stripe-hosted Checkout for the one-time unlock. Everything that decides what is bought and
 * for how much (product, amount, currency, the buyer) comes from the server, never from the request.
 */
final class CheckoutService
{
    /** Stripe's minimum; an abandoned checkout can't be paid hours later at a stale price. */
    private const int SESSION_LIFETIME_SECONDS = 1800;

    public function __construct(
        private readonly CheckoutGateway $gateway,
        private readonly PurchaseRepository $purchaseRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly Clock $clock,
        private readonly LoggerInterface $logger,
        #[Autowire('%frontend_url%')] private readonly string $frontendUrl,
        #[Autowire('%stripe_automatic_tax%')] private readonly bool $automaticTax,
    ) {
    }

    public function isAvailable(): bool
    {
        return $this->gateway->isConfigured();
    }

    /**
     * @return string the Stripe Checkout URL to send the browser to
     */
    public function start(User $user): string
    {
        if ($user->isUnlocked()) {
            throw new ConflictHttpException('Your account is already unlocked.');
        }
        if (!$user->isEmailVerified()) {
            // Stripe receipts and the customer record use this address; it must be the buyer's.
            throw new AccessDeniedHttpException('Confirm your email address before paying. We sent you a link when you signed up; you can resend it from the banner at the top of the page.');
        }
        if (!$this->gateway->isConfigured()) {
            $this->logger->error('Stripe Checkout is turned off.', ['reason' => $this->gateway->configurationProblem()]);

            throw new ServiceUnavailableHttpException(null, 'Payments are not available right now.');
        }

        // At most one payable checkout per user, so two open tabs can't both be paid.
        $this->expirePendingCheckouts($user);

        $now = $this->clock->now();
        try {
            $session = $this->gateway->createSession(
                $this->sessionParams($user, $now),
                // Network retries inside the SDK reuse this key, so a retry can't create a second session.
                'unlock-'.$user->getId().'-'.bin2hex(random_bytes(16)),
            );
        } catch (PaymentProviderException $e) {
            $this->logger->error('Could not start Stripe Checkout.', ['user_id' => $user->getId(), 'reason' => $e->getMessage()]);

            throw new ServiceUnavailableHttpException(null, 'Payments are not available right now. Please try again later.');
        }

        $this->entityManager->persist(new Purchase($user, UnlockOffer::PRODUCT, $session->id, UnlockOffer::AMOUNT_IN_CENTS, UnlockOffer::CURRENCY, $now));
        $this->entityManager->flush();
        $this->logger->info('Stripe Checkout started.', ['user_id' => $user->getId()]);

        return $session->url;
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionParams(User $user, \DateTimeImmutable $now): array
    {
        $metadata = ['user_id' => (string) $user->getId(), 'product' => UnlockOffer::PRODUCT];

        $params = [
            'mode' => 'payment',
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => UnlockOffer::CURRENCY,
                    'unit_amount' => UnlockOffer::AMOUNT_IN_CENTS,
                    'tax_behavior' => 'inclusive',
                    'product_data' => [
                        'name' => UnlockOffer::PRODUCT_NAME,
                        'description' => UnlockOffer::PRODUCT_DESCRIPTION,
                    ],
                ],
            ]],
            'client_reference_id' => (string) $user->getId(),
            'customer_email' => $user->getUserIdentifier(),
            'metadata' => $metadata,
            'payment_intent_data' => ['metadata' => $metadata],
            'submit_type' => 'pay',
            'locale' => 'auto',
            'expires_at' => $now->getTimestamp() + self::SESSION_LIFETIME_SECONDS,
            // No session ID in the return URL: the app asks the API for the account's state instead.
            'success_url' => $this->frontendUrl.'/plans?checkout=success',
            'cancel_url' => $this->frontendUrl.'/plans?checkout=cancelled',
        ];

        if ($this->automaticTax) {
            $params['automatic_tax'] = ['enabled' => true];
            // The billing address is the VAT location evidence; a VAT ID lets business buyers reverse-charge.
            $params['billing_address_collection'] = 'required';
            $params['tax_id_collection'] = ['enabled' => true];
            $params['customer_creation'] = 'always';
        }

        return $params;
    }

    private function expirePendingCheckouts(User $user): void
    {
        foreach ($this->purchaseRepository->findPendingForUser($user) as $purchase) {
            try {
                $this->gateway->expireSession($purchase->getStripeCheckoutSessionId());
            } catch (PaymentProviderException $e) {
                // Already completed or expired: its webhook settles it.
                $this->logger->info('Previous checkout session not expired.', ['purchase_id' => $purchase->getId(), 'reason' => $e->getMessage()]);
            }
        }
    }
}
