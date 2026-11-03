<?php

declare(strict_types=1);

namespace App\Tests\Payment;

use App\Payment\StripeCheckoutGateway;
use App\Payment\StripeKeyPolicy;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class StripeKeyPolicyTest extends TestCase
{
    // Made-up keys with the right shape; not real credentials.
    private const string TEST_KEY = 'sk_test_51FakeKeyForUnitTests';
    private const string LIVE_KEY = 'sk_live_51FakeKeyForUnitTests';
    private const string RESTRICTED_TEST_KEY = 'rk_test_51FakeKeyForUnitTests';
    private const string RESTRICTED_LIVE_KEY = 'rk_live_51FakeKeyForUnitTests';

    /**
     * @return iterable<string, array{string, string, string}>
     */
    public static function allowed(): iterable
    {
        yield 'test key on a laptop' => [self::TEST_KEY, 'test', 'dev'];
        yield 'restricted test key in CI' => [self::RESTRICTED_TEST_KEY, 'test', 'test'];
        yield 'test key on staging (prod build)' => [self::TEST_KEY, 'test', 'prod'];
        yield 'live key in production' => [self::LIVE_KEY, 'live', 'prod'];
        yield 'restricted live key in production' => [self::RESTRICTED_LIVE_KEY, 'live', 'prod'];
    }

    #[DataProvider('allowed')]
    public function testAllowsAKeyThatMatchesItsMode(string $key, string $mode, string $appEnv): void
    {
        self::assertNull(StripeKeyPolicy::problem($key, $mode, $appEnv));
    }

    /**
     * @return iterable<string, array{string, string, string, string}>
     */
    public static function refused(): iterable
    {
        yield 'live key on a laptop' => [self::LIVE_KEY, 'test', 'dev', 'is a live key but STRIPE_MODE=test'];
        yield 'live key on staging' => [self::LIVE_KEY, 'test', 'prod', 'is a live key but STRIPE_MODE=test'];
        yield 'live mode outside prod' => [self::LIVE_KEY, 'live', 'dev', 'only allowed with APP_ENV=prod'];
        yield 'test key in live production' => [self::TEST_KEY, 'live', 'prod', 'is a test key but STRIPE_MODE=live'];
        yield 'publishable key' => ['pk_test_51FakeKeyForUnitTests', 'test', 'dev', 'not a Stripe secret or restricted key'];
        yield 'garbage' => ['not-a-key', 'test', 'dev', 'not a Stripe secret or restricted key'];
        yield 'empty key' => ['', 'test', 'dev', 'is empty'];
        yield 'unknown mode' => [self::TEST_KEY, 'sandbox', 'dev', 'must be "test" or "live"'];
    }

    #[DataProvider('refused')]
    public function testRefusesAKeyFromTheWrongEnvironment(string $key, string $mode, string $appEnv, string $reason): void
    {
        $problem = StripeKeyPolicy::problem($key, $mode, $appEnv);

        self::assertNotNull($problem);
        self::assertStringContainsString($reason, $problem);
        self::assertStringNotContainsString('51FakeKey', $problem, 'The reason is logged, so it must never echo the key.');
    }

    public function testTheGatewayTurnsCheckoutOffForAMismatchedKey(): void
    {
        $gateway = new StripeCheckoutGateway(self::LIVE_KEY, 'test', 'dev');

        self::assertFalse($gateway->isConfigured());
        self::assertNotNull($gateway->configurationProblem());
    }

    public function testTheGatewayIsOnForAMatchingKey(): void
    {
        self::assertTrue((new StripeCheckoutGateway(self::TEST_KEY, 'test', 'dev'))->isConfigured());
    }
}
