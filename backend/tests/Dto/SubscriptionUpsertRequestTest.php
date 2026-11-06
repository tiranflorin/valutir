<?php

declare(strict_types=1);

namespace App\Tests\Dto;

use App\Dto\SubscriptionUpsertRequest;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Validation of the subscription create/update payload (POST, PUT and PATCH /api/subs).
 */
final class SubscriptionUpsertRequestTest extends KernelTestCase
{
    public function testATypicalPersonalSubscriptionIsValid(): void
    {
        self::assertSame([], $this->violations($this->request()));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function offeredCadences(): iterable
    {
        yield 'weekly' => ['weekly'];
        yield 'monthly' => ['monthly'];
        yield 'quarterly' => ['quarterly'];
        yield 'yearly' => ['yearly'];
    }

    #[DataProvider('offeredCadences')]
    public function testAcceptsTheCadencesTheAppOffers(string $cadence): void
    {
        self::assertSame([], $this->violations($this->request(cadence: $cadence)));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function rejectedCadences(): iterable
    {
        // "daily" was dropped; older rows may still hold it, but new writes must not.
        yield 'daily' => ['daily'];
        yield 'unknown' => ['hourly'];
        yield 'wrong case' => ['Monthly'];
    }

    #[DataProvider('rejectedCadences')]
    public function testRejectsOtherCadences(string $cadence): void
    {
        self::assertSame(['billingCadence'], array_keys($this->violations($this->request(cadence: $cadence))));
    }

    public function testASharedSubscriptionIsSplitBetweenTwoAndTenPeople(): void
    {
        self::assertSame([], $this->violations($this->request(shared: true, size: 4)));
        self::assertSame(
            ['householdSize' => 'Choose how many people share this subscription.'],
            $this->violations($this->request(shared: true, size: null)),
        );
        foreach ([1, 11] as $size) {
            self::assertSame(
                ['householdSize' => 'A shared subscription is split between 2 and 10 people.'],
                $this->violations($this->request(shared: true, size: $size)),
            );
        }
    }

    public function testBusinessSubscriptionsCannotBeShared(): void
    {
        self::assertSame(
            ['householdShared' => "Business subscriptions can't be shared with a household."],
            $this->violations($this->request(shared: true, size: 3, b2b: true)),
        );
    }

    public function testASubscriptionCannotBeCancelledBeforeItStarted(): void
    {
        $request = $this->request();
        $request->status = 'cancelled';
        $request->startedAt = '2026-03-10';

        foreach (['2026-03-10', '2026-04-01'] as $cancelledAt) {
            $request->cancelledAt = $cancelledAt;
            self::assertSame([], $this->violations($request), $cancelledAt);
        }

        $request->cancelledAt = '2026-03-09';
        self::assertSame(
            ['cancelledAt' => "The cancellation date can't be before the start date."],
            $this->violations($request),
        );

        // Without a start date there's nothing to compare against.
        $request->startedAt = null;
        self::assertSame([], $this->violations($request));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function allowedStatuses(): iterable
    {
        yield 'active' => ['active'];
        yield 'trial' => ['trial'];
        yield 'paused' => ['paused'];
        yield 'cancelled' => ['cancelled'];
    }

    #[DataProvider('allowedStatuses')]
    public function testAcceptsTheFourStatuses(string $status): void
    {
        $request = $this->request();
        $request->status = $status;

        self::assertSame([], $this->violations($request));
    }

    public function testRejectsTheRetiredOtherStatus(): void
    {
        $request = $this->request();
        $request->status = 'other';

        self::assertArrayHasKey('status', $this->violations($request));
    }

    public function testOnlyAPausedSubscriptionHasAResumeDate(): void
    {
        $request = $this->request();
        $request->status = 'paused';
        $request->resumesOn = '2027-01-01';
        self::assertSame([], $this->violations($request));

        $request->status = 'active';
        self::assertSame(['resumesOn' => 'Only a paused subscription has a resume date.'], $this->violations($request));
    }

    private function request(string $cadence = 'monthly', bool $shared = false, ?int $size = null, bool $b2b = false): SubscriptionUpsertRequest
    {
        $request = new SubscriptionUpsertRequest();
        $request->serviceName = 'Netflix';
        $request->amount = 13.99;
        $request->currency = 'EUR';
        $request->billingCadence = $cadence;
        $request->status = 'active';
        $request->b2b = $b2b;
        $request->householdShared = $shared;
        $request->householdSize = $size;

        return $request;
    }

    /**
     * @return array<string, string> property path => message
     */
    private function violations(SubscriptionUpsertRequest $request): array
    {
        self::bootKernel();
        $result = [];
        foreach (self::getContainer()->get(ValidatorInterface::class)->validate($request) as $violation) {
            $result[$violation->getPropertyPath()] = (string) $violation->getMessage();
        }

        return $result;
    }
}
