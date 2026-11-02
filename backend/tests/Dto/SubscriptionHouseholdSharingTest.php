<?php

declare(strict_types=1);

namespace App\Tests\Dto;

use App\Dto\SubscriptionUpsertRequest;
use App\Entity\Subscription;
use App\Repository\SubscriptionRepository;
use App\Service\SubscriptionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class SubscriptionHouseholdSharingTest extends KernelTestCase
{
    public function testSharedPersonalSubscriptionWithSizeIsValid(): void
    {
        self::assertSame([], $this->violations($this->request(shared: true, size: 4)));
    }

    public function testSharedSubscriptionNeedsAHouseholdSize(): void
    {
        self::assertSame(
            ['householdSize' => 'Choose how many people share this subscription.'],
            $this->violations($this->request(shared: true, size: null)),
        );
    }

    public function testHouseholdSizeMustBeBetweenTwoAndTen(): void
    {
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

    public function testSharingIsStoredAndClearedThroughTheService(): void
    {
        self::bootKernel();
        $service = new SubscriptionService(
            $this->createStub(EntityManagerInterface::class),
            $this->createStub(SubscriptionRepository::class),
            self::getContainer()->get(ValidatorInterface::class),
        );
        $subscription = new Subscription();

        $service->update($subscription, $this->request(shared: true, size: 4));
        self::assertTrue($subscription->isHouseholdShared());
        self::assertSame(4, $subscription->getHouseholdSize());

        // A size sent without the shared flag is ignored, so turning sharing off clears it.
        $service->update($subscription, $this->request(shared: false, size: 4));
        self::assertFalse($subscription->isHouseholdShared());
        self::assertNull($subscription->getHouseholdSize());
    }

    public function testApiRepresentationIncludesSharing(): void
    {
        $subscription = (new Subscription())->setHouseholdSharing(3);
        $subscription->onPrePersist();

        $data = $subscription->toArray();

        self::assertTrue($data['householdShared']);
        self::assertSame(3, $data['householdSize']);
    }

    private function request(bool $shared, ?int $size, bool $b2b = false): SubscriptionUpsertRequest
    {
        $request = new SubscriptionUpsertRequest();
        $request->serviceName = 'Netflix';
        $request->amount = 13.99;
        $request->currency = 'EUR';
        $request->billingCadence = 'monthly';
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
