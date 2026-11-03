<?php

declare(strict_types=1);

namespace App\Tests\Payment;

use App\Clock\Clock;
use App\Entity\Purchase;
use App\Entity\User;
use App\Payment\StripeWebhookHandler;
use App\Payment\UnlockOffer;
use App\Repository\PurchaseRepository;
use Doctrine\ORM\EntityManager;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Stripe\Event;

final class StripeWebhookHandlerTest extends TestCase
{
    private const string SESSION_ID = 'cs_test_123';
    private const string PAYMENT_INTENT_ID = 'pi_test_123';
    private const int USER_ID = 42;

    private User $user;
    private Purchase $purchase;

    protected function setUp(): void
    {
        $this->user = new User();
        (new \ReflectionProperty(User::class, 'id'))->setValue($this->user, self::USER_ID);
        $this->purchase = new Purchase($this->user, UnlockOffer::PRODUCT, self::SESSION_ID, UnlockOffer::AMOUNT_IN_CENTS, UnlockOffer::CURRENCY, new \DateTimeImmutable('-5 minutes'));
    }

    public function testAPaidCheckoutUnlocksTheAccount(): void
    {
        $this->handler()->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));

        self::assertTrue($this->purchase->isPaid());
        self::assertSame(self::PAYMENT_INTENT_ID, $this->purchase->getStripePaymentIntentId());
        self::assertTrue($this->user->isUnlocked());
    }

    public function testADelayedPaymentUnlocksOnlyOnceItSucceeds(): void
    {
        $handler = $this->handler();

        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED, ['payment_status' => 'unpaid']));
        self::assertTrue($this->purchase->isPending());
        self::assertFalse($this->user->isUnlocked());

        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED));
        self::assertTrue($this->user->isUnlocked());
    }

    public function testAFailedDelayedPaymentDoesNotUnlock(): void
    {
        $this->handler()->handle($this->sessionEvent(Event::CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED, ['payment_status' => 'unpaid']));

        self::assertSame(Purchase::STATUS_FAILED, $this->purchase->getStatus());
        self::assertFalse($this->user->isUnlocked());
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function tamperedSessions(): iterable
    {
        yield 'lower amount' => [['amount_total' => 1]];
        yield 'other currency' => [['currency' => 'ron']];
        yield 'subscription mode' => [['mode' => 'subscription']];
        yield 'another buyer' => [['client_reference_id' => '7']];
        yield 'another product' => [['metadata' => ['product' => 'something_else']]];
    }

    /**
     * @param array<string, mixed> $override
     */
    #[DataProvider('tamperedSessions')]
    public function testASessionThatDoesNotMatchItsPurchaseUnlocksNothing(array $override): void
    {
        $this->handler()->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED, $override));

        self::assertTrue($this->purchase->isPending());
        self::assertFalse($this->user->isUnlocked());
    }

    public function testASessionThisServerDidNotCreateIsIgnored(): void
    {
        $repository = $this->createStub(PurchaseRepository::class);
        $repository->method('findOneByCheckoutSessionIdForUpdate')->willReturn(null);

        $this->handler($repository)->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));

        self::assertFalse($this->user->isUnlocked());
    }

    public function testARepeatedEventChangesNothing(): void
    {
        $handler = $this->handler();
        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));
        $paidAt = $this->purchase->getPaidAt();
        $unlockedAt = $this->user->getUnlockedAt();

        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));

        self::assertSame($paidAt, $this->purchase->getPaidAt());
        self::assertSame($unlockedAt, $this->user->getUnlockedAt());
    }

    public function testAnExpiredSessionIsClosedWithoutUnlocking(): void
    {
        $this->handler()->handle($this->sessionEvent(Event::CHECKOUT_SESSION_EXPIRED, ['payment_status' => 'unpaid']));

        self::assertSame(Purchase::STATUS_EXPIRED, $this->purchase->getStatus());
    }

    public function testAFullRefundRevokesTheUnlock(): void
    {
        $handler = $this->handler();
        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));

        $handler->handle($this->event(Event::CHARGE_REFUNDED, ['object' => 'charge', 'id' => 'ch_1', 'payment_intent' => self::PAYMENT_INTENT_ID, 'refunded' => true]));

        self::assertSame(Purchase::STATUS_REFUNDED, $this->purchase->getStatus());
        self::assertFalse($this->user->isUnlocked());
    }

    public function testAPartialRefundKeepsTheUnlock(): void
    {
        $handler = $this->handler();
        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));

        $handler->handle($this->event(Event::CHARGE_REFUNDED, ['object' => 'charge', 'id' => 'ch_1', 'payment_intent' => self::PAYMENT_INTENT_ID, 'refunded' => false]));

        self::assertTrue($this->purchase->isPaid());
        self::assertTrue($this->user->isUnlocked());
    }

    public function testADisputeRevokesTheUnlock(): void
    {
        $handler = $this->handler();
        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));

        $handler->handle($this->event(Event::CHARGE_DISPUTE_CREATED, ['object' => 'dispute', 'id' => 'dp_1', 'payment_intent' => self::PAYMENT_INTENT_ID]));

        self::assertSame(Purchase::STATUS_DISPUTED, $this->purchase->getStatus());
        self::assertFalse($this->user->isUnlocked());
    }

    public function testARefundKeepsTheUnlockWhenAnotherPaymentStillCoversIt(): void
    {
        $handler = $this->handler(otherPaidPurchase: true);
        $handler->handle($this->sessionEvent(Event::CHECKOUT_SESSION_COMPLETED));

        $handler->handle($this->event(Event::CHARGE_REFUNDED, ['object' => 'charge', 'id' => 'ch_1', 'payment_intent' => self::PAYMENT_INTENT_ID, 'refunded' => true]));

        self::assertSame(Purchase::STATUS_REFUNDED, $this->purchase->getStatus());
        self::assertTrue($this->user->isUnlocked());
    }

    public function testUnrelatedEventsDoNotTouchTheDatabase(): void
    {
        $entityManager = $this->createMock(EntityManager::class);
        $entityManager->expects(self::never())->method('wrapInTransaction');
        $handler = new StripeWebhookHandler($this->createStub(PurchaseRepository::class), $entityManager, $this->clock(), new NullLogger());

        $handler->handle($this->event('customer.created', ['object' => 'customer', 'id' => 'cus_1']));
    }

    private function handler(?PurchaseRepository $repository = null, bool $otherPaidPurchase = false): StripeWebhookHandler
    {
        if (null === $repository) {
            $repository = $this->createStub(PurchaseRepository::class);
            $repository->method('findOneByCheckoutSessionIdForUpdate')->willReturnCallback(
                fn (string $id): ?Purchase => self::SESSION_ID === $id ? $this->purchase : null,
            );
            $repository->method('findOneByPaymentIntentIdForUpdate')->willReturnCallback(
                fn (string $id): ?Purchase => $id === $this->purchase->getStripePaymentIntentId() ? $this->purchase : null,
            );
            $repository->method('hasOtherPaidPurchase')->willReturn($otherPaidPurchase);
        }
        $entityManager = $this->createStub(EntityManager::class);
        $entityManager->method('wrapInTransaction')->willReturnCallback(static fn (callable $work): mixed => $work());

        return new StripeWebhookHandler($repository, $entityManager, $this->clock(), new NullLogger());
    }

    private function clock(): Clock
    {
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable('2026-11-03 10:00:00'));

        return $clock;
    }

    /**
     * @param array<string, mixed> $override
     */
    private function sessionEvent(string $type, array $override = []): Event
    {
        return $this->event($type, $override + [
            'object' => 'checkout.session',
            'id' => self::SESSION_ID,
            'mode' => 'payment',
            'payment_status' => 'paid',
            'amount_subtotal' => UnlockOffer::AMOUNT_IN_CENTS,
            'amount_total' => UnlockOffer::AMOUNT_IN_CENTS,
            'currency' => UnlockOffer::CURRENCY,
            'client_reference_id' => (string) self::USER_ID,
            'payment_intent' => self::PAYMENT_INTENT_ID,
            'metadata' => ['user_id' => (string) self::USER_ID, 'product' => UnlockOffer::PRODUCT],
        ]);
    }

    /**
     * @param array<string, mixed> $object
     */
    private function event(string $type, array $object): Event
    {
        return Event::constructFrom([
            'id' => 'evt_'.bin2hex(random_bytes(4)),
            'object' => 'event',
            'type' => $type,
            'data' => ['object' => $object],
        ]);
    }
}
