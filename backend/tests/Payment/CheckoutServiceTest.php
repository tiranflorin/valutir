<?php

declare(strict_types=1);

namespace App\Tests\Payment;

use App\Clock\Clock;
use App\Entity\Purchase;
use App\Entity\User;
use App\Payment\CheckoutGateway;
use App\Payment\CheckoutService;
use App\Payment\CheckoutSession;
use App\Payment\PaymentProviderException;
use App\Payment\UnlockOffer;
use App\Repository\PurchaseRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

final class CheckoutServiceTest extends TestCase
{
    private const string CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_1';

    private User $user;

    protected function setUp(): void
    {
        $this->user = (new User())->setEmail('Buyer@Example.com');
        (new \ReflectionProperty(User::class, 'id'))->setValue($this->user, 42);
    }

    public function testTheServerDecidesWhatIsBoughtAndForHowMuch(): void
    {
        $sent = null;
        $gateway = $this->gateway();
        $gateway->expects(self::once())->method('createSession')->willReturnCallback(
            static function (array $params) use (&$sent): CheckoutSession {
                $sent = $params;

                return new CheckoutSession('cs_test_1', self::CHECKOUT_URL);
            },
        );
        $persisted = null;
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist')->willReturnCallback(static function (object $entity) use (&$persisted): void {
            $persisted = $entity;
        });

        $url = $this->service($gateway, entityManager: $entityManager)->start($this->user);

        self::assertSame(self::CHECKOUT_URL, $url);
        self::assertSame('payment', $sent['mode']);
        self::assertSame(1, $sent['line_items'][0]['quantity']);
        self::assertSame(UnlockOffer::AMOUNT_IN_CENTS, $sent['line_items'][0]['price_data']['unit_amount']);
        self::assertSame('eur', $sent['line_items'][0]['price_data']['currency']);
        self::assertSame('inclusive', $sent['line_items'][0]['price_data']['tax_behavior']);
        self::assertSame('42', $sent['client_reference_id']);
        self::assertSame('buyer@example.com', $sent['customer_email']);
        self::assertSame(UnlockOffer::PRODUCT, $sent['metadata']['product']);
        self::assertSame('https://app.example.com/plans?checkout=success', $sent['success_url']);
        self::assertSame(['enabled' => true], $sent['automatic_tax']);
        self::assertSame('required', $sent['billing_address_collection']);

        self::assertInstanceOf(Purchase::class, $persisted);
        self::assertSame('cs_test_1', $persisted->getStripeCheckoutSessionId());
        self::assertSame($this->user, $persisted->getUser());
        self::assertTrue($persisted->isPending());
    }

    public function testTaxCollectionCanBeSwitchedOff(): void
    {
        $sent = null;
        $gateway = $this->gateway();
        $gateway->expects(self::once())->method('createSession')->willReturnCallback(static function (array $params) use (&$sent): CheckoutSession {
            $sent = $params;

            return new CheckoutSession('cs_test_1', self::CHECKOUT_URL);
        });

        $this->service($gateway, automaticTax: false)->start($this->user);

        self::assertArrayNotHasKey('automatic_tax', $sent);
        self::assertArrayNotHasKey('tax_id_collection', $sent);
    }

    public function testEarlierOpenCheckoutsAreClosedSoOnlyOneCanBePaid(): void
    {
        $earlier = new Purchase($this->user, UnlockOffer::PRODUCT, 'cs_old', UnlockOffer::AMOUNT_IN_CENTS, UnlockOffer::CURRENCY, new \DateTimeImmutable('-10 minutes'));
        $repository = $this->createStub(PurchaseRepository::class);
        $repository->method('findPendingForUser')->willReturn([$earlier]);
        $gateway = $this->gateway();
        $gateway->expects(self::once())->method('expireSession')->with('cs_old')
            ->willThrowException(new PaymentProviderException('already complete')); // Best effort: still continues.
        $gateway->method('createSession')->willReturn(new CheckoutSession('cs_new', self::CHECKOUT_URL));

        self::assertSame(self::CHECKOUT_URL, $this->service($gateway, $repository)->start($this->user));
    }

    public function testAnUnlockedAccountCannotPayAgain(): void
    {
        $this->user->unlock(new \DateTimeImmutable());
        $gateway = $this->gateway();
        $gateway->expects(self::never())->method('createSession');
        $this->expectException(ConflictHttpException::class);

        $this->service($gateway)->start($this->user);
    }

    public function testCheckoutIsUnavailableWithoutStripeKeys(): void
    {
        $gateway = $this->createMock(CheckoutGateway::class);
        $gateway->method('isConfigured')->willReturn(false);
        $gateway->expects(self::never())->method('createSession');
        $this->expectException(ServiceUnavailableHttpException::class);

        $this->service($gateway)->start($this->user);
    }

    public function testAProviderFailureStoresNothingAndShowsAGenericError(): void
    {
        $gateway = $this->gateway();
        $gateway->expects(self::once())->method('createSession')->willThrowException(new PaymentProviderException('Stripe rejected the checkout session (api_key_expired).'));
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');

        try {
            $this->service($gateway, entityManager: $entityManager)->start($this->user);
            self::fail('Expected a 503.');
        } catch (ServiceUnavailableHttpException $e) {
            self::assertStringNotContainsString('api_key', $e->getMessage());
        }
    }

    private function gateway(): CheckoutGateway&\PHPUnit\Framework\MockObject\MockObject
    {
        $gateway = $this->createMock(CheckoutGateway::class);
        $gateway->method('isConfigured')->willReturn(true);

        return $gateway;
    }

    private function service(
        CheckoutGateway $gateway,
        ?PurchaseRepository $repository = null,
        ?EntityManagerInterface $entityManager = null,
        bool $automaticTax = true,
    ): CheckoutService {
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable('2026-11-03 10:00:00'));

        return new CheckoutService(
            $gateway,
            $repository ?? $this->createStub(PurchaseRepository::class),
            $entityManager ?? $this->createStub(EntityManagerInterface::class),
            $clock,
            new NullLogger(),
            'https://app.example.com',
            $automaticTax,
        );
    }
}
