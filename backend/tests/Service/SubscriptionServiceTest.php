<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Dto\SubscriptionUpsertRequest;
use App\Entity\Subscription;
use App\Repository\SubscriptionRepository;
use App\Service\SubscriptionService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class SubscriptionServiceTest extends TestCase
{
    public function testDeleteSoftDeletesAndMarksSubscriptionCancelled(): void
    {
        $subscription = new Subscription();
        $subscription->setStatus('active');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('flush');
        $entityManager->expects(self::never())->method('remove');

        $service = new SubscriptionService(
            $entityManager,
            $this->createStub(SubscriptionRepository::class),
            $this->createStub(ValidatorInterface::class),
        );
        $service->delete($subscription, true);

        self::assertSame('cancelled', $subscription->getStatus());
        self::assertNotNull($subscription->getDeletedAt());
        self::assertNotNull($subscription->getCancelledAt());
        self::assertTrue($subscription->getDeletedUseful());
    }

    public function testUpdateKeepsReminderTimestampWhenTrialEndDateIsUnchanged(): void
    {
        $subscription = $this->trialSubscription('2026-11-15');
        $sentAt = $subscription->getTrialReminderSentAt();

        $this->createService()->update($subscription, $this->trialRequest('2026-11-15'));

        self::assertSame($sentAt, $subscription->getTrialReminderSentAt());
        self::assertSame('2026-11-15', $subscription->getTrialEndsAt()?->format('Y-m-d'));
    }

    public function testUpdateClearsReminderTimestampWhenTrialEndDateChanges(): void
    {
        $subscription = $this->trialSubscription('2026-11-15');

        $this->createService()->update($subscription, $this->trialRequest('2026-12-01'));

        self::assertNull($subscription->getTrialReminderSentAt());
        self::assertSame('2026-12-01', $subscription->getTrialEndsAt()?->format('Y-m-d'));
    }

    public function testReminderTimestampIsNotWritableByClients(): void
    {
        self::assertFalse(property_exists(SubscriptionUpsertRequest::class, 'trialReminderSentAt'));
    }

    private function createService(): SubscriptionService
    {
        $validator = $this->createStub(ValidatorInterface::class);
        $validator->method('validate')->willReturn(new ConstraintViolationList());

        return new SubscriptionService(
            $this->createStub(EntityManagerInterface::class),
            $this->createStub(SubscriptionRepository::class),
            $validator,
        );
    }

    private function trialSubscription(string $trialEndsAt): Subscription
    {
        $subscription = new Subscription();
        $subscription->setTrialEndsAt(new \DateTimeImmutable($trialEndsAt));
        $subscription->setTrialReminderSentAt(new \DateTimeImmutable('2026-11-13 09:00:00'));

        return $subscription;
    }

    private function trialRequest(string $trialEndsAt): SubscriptionUpsertRequest
    {
        $request = new SubscriptionUpsertRequest();
        $request->serviceName = 'Trial X';
        $request->amount = 9.99;
        $request->currency = 'EUR';
        $request->billingCadence = 'monthly';
        $request->status = 'trial';
        $request->trialEndsAt = $trialEndsAt;

        return $request;
    }
}
