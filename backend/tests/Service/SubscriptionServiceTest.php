<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Dto\SubscriptionUpsertRequest;
use App\Entity\Subscription;
use App\Entity\User;
use App\Exception\ApiValidationException;
use App\Payment\FreePlanLimit;
use App\Repository\SubscriptionRepository;
use App\Service\SubscriptionService;
use Doctrine\ORM\EntityManager;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class SubscriptionServiceTest extends TestCase
{
    public function testCreateStoresTheMappedSubscriptionForItsOwnerInOneTransaction(): void
    {
        $user = new User();
        $persisted = null;
        $entityManager = $this->transactionalEntityManager();
        $entityManager->expects(self::once())->method('persist')->willReturnCallback(static function (Subscription $subscription) use (&$persisted): void {
            $persisted = $subscription;
        });
        $entityManager->expects(self::once())->method('flush');

        $request = $this->request();
        $request->serviceName = '  Netflix ';
        $request->amount = 9.5;
        $request->category = ' Streaming ';
        $request->nextBillingDate = '2026-12-01';
        $request->paymentMethod = ' Visa ';

        $created = $this->service($entityManager)->create($user, $request);

        self::assertSame($persisted, $created);
        self::assertSame($user, $created->getUser());
        self::assertSame('Netflix', $created->getServiceName());
        self::assertSame('9.50', $created->getAmount());
        self::assertSame('EUR', $created->getCurrency());
        self::assertSame('monthly', $created->getBillingCadence());
        self::assertSame('Streaming', $created->getCategory());
        self::assertSame('Visa', $created->getPaymentMethod());
        self::assertSame('active', $created->getStatus());
        self::assertSame('2026-12-01', $created->getNextBillingDate()?->format('Y-m-d'));
    }

    public function testAFreeAccountAtTheLimitCannotCreateAnotherActiveSubscription(): void
    {
        $entityManager = $this->transactionalEntityManager();
        $entityManager->expects(self::never())->method('persist');

        try {
            $this->service($entityManager, activeCount: FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS)->create(new User(), $this->request());
            self::fail('Expected the free plan limit to block the create.');
        } catch (HttpException $e) {
            self::assertSame(402, $e->getStatusCode());
        }
    }

    public function testInvalidInputIsRejectedBeforeAnyWrite(): void
    {
        $entityManager = $this->createMock(EntityManager::class);
        $entityManager->expects(self::never())->method('wrapInTransaction');
        $validator = $this->createStub(ValidatorInterface::class);
        $validator->method('validate')->willReturn(new ConstraintViolationList([
            new ConstraintViolation('This value should not be blank.', null, [], null, 'serviceName', ''),
        ]));

        $this->expectException(ApiValidationException::class);

        $this->service($entityManager, validator: $validator)->create(new User(), $this->request());
    }

    public function testAnotherUsersSubscriptionIsNotFound(): void
    {
        $user = new User();
        $repository = $this->createMock(SubscriptionRepository::class);
        $repository->expects(self::once())->method('findOneByIdAndUser')->with(7, $user)->willReturn(null);
        $service = new SubscriptionService($this->createStub(EntityManager::class), $repository, $this->createStub(ValidatorInterface::class), new FreePlanLimit($this->createStub(EntityManager::class), $repository));

        $this->expectException(NotFoundHttpException::class);

        $service->getForUser(7, $user);
    }

    public function testHouseholdSharingIsStoredAndClearedByUpdates(): void
    {
        $subscription = new Subscription();
        $service = $this->service($this->transactionalEntityManager(times: 2));

        $request = $this->request();
        $request->householdShared = true;
        $request->householdSize = 4;
        $service->update($subscription, $request);
        self::assertTrue($subscription->isHouseholdShared());
        self::assertSame(4, $subscription->getHouseholdSize());

        // A size sent without the shared flag is ignored, so turning sharing off clears it.
        $request->householdShared = false;
        $service->update($subscription, $request);
        self::assertFalse($subscription->isHouseholdShared());
        self::assertNull($subscription->getHouseholdSize());
    }

    public function testTheManageLinkIsStoredAndClearedByUpdates(): void
    {
        $subscription = new Subscription();
        $service = $this->service($this->transactionalEntityManager(times: 2));

        $request = $this->request();
        $request->manageUrl = '  https://www.spotify.com/account/subscription/  ';
        $service->update($subscription, $request);
        self::assertSame('https://www.spotify.com/account/subscription/', $subscription->getManageUrl());
        self::assertSame('https://www.spotify.com/account/subscription/', $subscription->toArray()['manageUrl']);

        // Updates replace every field: leaving it out clears it.
        $request->manageUrl = null;
        $service->update($subscription, $request);
        self::assertNull($subscription->getManageUrl());
    }

    public function testUpdateKeepsTheTrialReminderUnlessTheTrialEndDateChanges(): void
    {
        $subscription = new Subscription();
        $subscription->setTrialEndsAt(new \DateTimeImmutable('2026-11-15'));
        $sentAt = new \DateTimeImmutable('2026-11-13 09:00:00');
        $subscription->setTrialReminderSentAt($sentAt);
        $service = $this->service($this->transactionalEntityManager(times: 2));

        $service->update($subscription, $this->trialRequest('2026-11-15'));
        self::assertSame($sentAt, $subscription->getTrialReminderSentAt());

        $service->update($subscription, $this->trialRequest('2026-12-01'));
        self::assertNull($subscription->getTrialReminderSentAt());
        self::assertSame('2026-12-01', $subscription->getTrialEndsAt()?->format('Y-m-d'));
    }

    public function testDeleteSoftDeletesAndMarksSubscriptionCancelled(): void
    {
        $subscription = new Subscription();
        $subscription->setStatus('active');
        $entityManager = $this->createMock(EntityManager::class);
        $entityManager->expects(self::once())->method('flush');
        $entityManager->expects(self::never())->method('remove');

        $this->service($entityManager)->delete($subscription, true);

        self::assertSame('cancelled', $subscription->getStatus());
        self::assertNotNull($subscription->getDeletedAt());
        self::assertNotNull($subscription->getCancelledAt());
        self::assertTrue($subscription->getDeletedUseful());
    }

    public function testPausingKeepsTheResumeDateAndOtherStatusesDropIt(): void
    {
        $subscription = new Subscription();
        $service = $this->service($this->transactionalEntityManager(times: 2));

        $request = $this->request();
        $request->status = 'paused';
        $request->resumesOn = '2027-01-15';
        $service->update($subscription, $request);
        self::assertSame('paused', $subscription->getStatus());
        self::assertSame('2027-01-15', $subscription->getResumesOn()?->format('Y-m-d'));

        $request->status = 'active';
        $service->update($subscription, $request);
        self::assertNull($subscription->getResumesOn());
    }

    public function testResumingAPausedSubscriptionCountsTowardsTheFreeLimit(): void
    {
        $subscription = new Subscription();
        $subscription->setStatus('paused');
        $subscription->setUser((new User())->setEmail('a@example.test'));
        $entityManager = $this->transactionalEntityManager();
        $entityManager->expects(self::never())->method('flush');

        $this->expectException(HttpException::class);
        $this->service($entityManager, activeCount: FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS)->update($subscription, $this->request());
    }

    public function testFlagForReviewKeepsTheStatusAndStoresTheNote(): void
    {
        $subscription = new Subscription();
        $subscription->setStatus('active');
        $entityManager = $this->createMock(EntityManager::class);
        $entityManager->expects(self::exactly(3))->method('flush');
        $service = $this->service($entityManager);

        $service->flagForReview($subscription, '  Do the kids still use it?  ');
        $flaggedAt = $subscription->getReviewFlaggedAt();
        self::assertSame('active', $subscription->getStatus());
        self::assertNotNull($flaggedAt);
        self::assertSame('Do the kids still use it?', $subscription->getReviewNote());

        // Changing the note keeps the original flag date.
        $service->flagForReview($subscription, '');
        self::assertSame($flaggedAt, $subscription->getReviewFlaggedAt());
        self::assertNull($subscription->getReviewNote());

        $service->clearReviewFlag($subscription);
        self::assertFalse($subscription->isReviewFlagged());
    }

    public function testACancelledSubscriptionCannotBeFlagged(): void
    {
        $subscription = new Subscription();
        $subscription->setStatus('cancelled');

        $this->expectException(ConflictHttpException::class);
        $this->service($this->createStub(EntityManager::class))->flagForReview($subscription, null);
    }

    public function testCancellingClearsTheReviewFlag(): void
    {
        $subscription = new Subscription();
        $subscription->setStatus('active');
        $subscription->flagForReview(new \DateTimeImmutable(), 'Still needed?');

        $request = $this->request();
        $request->status = 'cancelled';
        $request->cancelledAt = '2026-11-06';
        $this->service($this->transactionalEntityManager())->update($subscription, $request);

        self::assertFalse($subscription->isReviewFlagged());
        self::assertNull($subscription->getReviewNote());
    }

    private function service(EntityManager $entityManager, int $activeCount = 0, ?ValidatorInterface $validator = null): SubscriptionService
    {
        if (null === $validator) {
            $validator = $this->createStub(ValidatorInterface::class);
            $validator->method('validate')->willReturn(new ConstraintViolationList());
        }
        $repository = $this->createStub(SubscriptionRepository::class);
        $repository->method('countWithStatuses')->willReturn($activeCount);

        return new SubscriptionService($entityManager, $repository, $validator, new FreePlanLimit($entityManager, $repository));
    }

    private function transactionalEntityManager(int $times = 1): EntityManager&MockObject
    {
        $entityManager = $this->createMock(EntityManager::class);
        $entityManager->expects(self::exactly($times))->method('wrapInTransaction')->willReturnCallback(static fn (callable $work): mixed => $work());

        return $entityManager;
    }

    private function request(): SubscriptionUpsertRequest
    {
        $request = new SubscriptionUpsertRequest();
        $request->serviceName = 'Netflix';
        $request->amount = 13.99;
        $request->currency = 'EUR';
        $request->billingCadence = 'monthly';
        $request->status = 'active';

        return $request;
    }

    private function trialRequest(string $trialEndsAt): SubscriptionUpsertRequest
    {
        $request = $this->request();
        $request->status = 'trial';
        $request->trialEndsAt = $trialEndsAt;

        return $request;
    }
}
