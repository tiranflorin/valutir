<?php

declare(strict_types=1);

namespace App\Payment;

use App\Clock\Clock;
use App\Entity\Purchase;
use App\Repository\PurchaseRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Stripe\Event;
use Stripe\StripeObject;

/**
 * Applies verified Stripe events to purchases and accounts. Only the webhook unlocks an account:
 * the browser's return from Checkout proves nothing.
 *
 * Safe against Stripe's at-least-once, unordered delivery: each change is a one-way state transition
 * on a row locked for the duration, so a repeated event changes nothing. Events for sessions this
 * server didn't create, and figures that don't match what it asked for, are logged and ignored.
 */
final class StripeWebhookHandler
{
    public function __construct(
        private readonly PurchaseRepository $purchaseRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly Clock $clock,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function handle(Event $event): void
    {
        $object = $event->data->object ?? null;
        if (!$object instanceof StripeObject) {
            return;
        }

        $apply = match ($event->type) {
            Event::CHECKOUT_SESSION_COMPLETED,
            Event::CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED => fn () => $this->onSessionSettled($event, $object),
            Event::CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED => fn () => $this->onSessionUnpaid($event, $object, Purchase::STATUS_FAILED),
            Event::CHECKOUT_SESSION_EXPIRED => fn () => $this->onSessionUnpaid($event, $object, Purchase::STATUS_EXPIRED),
            Event::CHARGE_REFUNDED => fn () => $this->onChargeRefunded($event, $object),
            Event::CHARGE_DISPUTE_CREATED => fn () => $this->onPaymentReversed($event, $this->string($object, 'payment_intent'), Purchase::STATUS_DISPUTED),
            default => null, // Not subscribed to, or not relevant: acknowledged and ignored.
        };

        if (null !== $apply) {
            $this->entityManager->wrapInTransaction($apply);
        }
    }

    private function onSessionSettled(Event $event, StripeObject $session): void
    {
        $purchase = $this->purchaseForSession($event, $session);
        if (null === $purchase) {
            return;
        }
        $purchase->setStripePaymentIntentId($this->string($session, 'payment_intent'));

        // Delayed methods (e.g. SEPA debit) complete the session "unpaid"; async_payment_succeeded follows.
        if ('paid' !== $this->string($session, 'payment_status')) {
            return;
        }
        if (!$this->matchesPurchase($session, $purchase)) {
            $this->logger->error('Stripe session does not match its purchase; account not unlocked.', $this->context($event, $purchase));

            return;
        }

        $now = $this->clock->now();
        $purchase->markPaid($now);
        if ($purchase->isPaid()) {
            $purchase->getUser()?->unlock($now);
            $this->logger->info('Account unlocked by Stripe payment.', $this->context($event, $purchase));
        }
    }

    private function onSessionUnpaid(Event $event, StripeObject $session, string $status): void
    {
        $this->purchaseForSession($event, $session)?->markUnpaid($status);
    }

    private function onChargeRefunded(Event $event, StripeObject $charge): void
    {
        if (true !== ($charge->refunded ?? null)) {
            // Partial refund: goodwill gesture, the unlock stays.
            $this->logger->info('Partial Stripe refund; unlock kept.', ['event_id' => $event->id]);

            return;
        }
        $this->onPaymentReversed($event, $this->string($charge, 'payment_intent'), Purchase::STATUS_REFUNDED);
    }

    private function onPaymentReversed(Event $event, ?string $paymentIntentId, string $status): void
    {
        $purchase = null !== $paymentIntentId ? $this->purchaseRepository->findOneByPaymentIntentIdForUpdate($paymentIntentId) : null;
        if (null === $purchase || !$purchase->isPaid()) {
            return;
        }

        $purchase->revoke($status, $this->clock->now());
        $user = $purchase->getUser();
        if (null !== $user && !$this->purchaseRepository->hasOtherPaidPurchase($user, $purchase)) {
            $user->revokeUnlock();
        }
        $this->logger->warning('Stripe payment reversed; unlock revoked.', $this->context($event, $purchase) + ['status' => $status]);
    }

    private function purchaseForSession(Event $event, StripeObject $session): ?Purchase
    {
        $sessionId = $this->string($session, 'id');
        $purchase = null !== $sessionId ? $this->purchaseRepository->findOneByCheckoutSessionIdForUpdate($sessionId) : null;
        if (null === $purchase) {
            $this->logger->warning('Stripe event for an unknown checkout session ignored.', ['event_id' => $event->id, 'type' => $event->type]);
        }

        return $purchase;
    }

    /**
     * The session must be the one-time payment this server created, for its amount, currency, and buyer.
     * Stripe reports amount_total in cents, the same unit as the purchase.
     */
    private function matchesPurchase(StripeObject $session, Purchase $purchase): bool
    {
        $user = $purchase->getUser();
        $metadata = $session->metadata ?? null;

        return 'payment' === $this->string($session, 'mode')
            && $purchase->getAmountInCents() === ($session->amount_total ?? null)
            && $purchase->getCurrency() === $this->string($session, 'currency')
            && $metadata instanceof StripeObject
            && $purchase->getProduct() === ($metadata->product ?? null)
            && (null === $user || (string) $user->getId() === $this->string($session, 'client_reference_id'));
    }

    private function string(StripeObject $object, string $key): ?string
    {
        $value = $object[$key] ?? null;
        if ($value instanceof StripeObject) {
            $value = $value['id'] ?? null; // Expanded object instead of an ID.
        }

        return \is_string($value) && '' !== $value ? $value : null;
    }

    /**
     * @return array<string, mixed> Stripe and internal IDs only, no personal or card data
     */
    private function context(Event $event, Purchase $purchase): array
    {
        return [
            'event_id' => $event->id,
            'type' => $event->type,
            'purchase_id' => $purchase->getId(),
            'user_id' => $purchase->getUser()?->getId(),
        ];
    }
}
