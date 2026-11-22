<?php

declare(strict_types=1);

namespace App\Service;

use App\Billing\UserTime;
use App\Clock\Clock;
use App\Dto\SubscriptionUpsertRequest;
use App\Entity\PriceTerms;
use App\Entity\Subscription;
use App\Entity\User;
use App\Exception\ApiValidationException;
use App\Payment\FreePlanLimit;
use App\Repository\SubscriptionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class SubscriptionService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly SubscriptionRepository $subscriptionRepository,
        private readonly ValidatorInterface $validator,
        private readonly FreePlanLimit $freePlanLimit,
        private readonly Clock $clock,
    ) {
    }

    /**
     * @return Subscription[]
     */
    public function listForUser(User $user): array
    {
        return $this->subscriptionRepository->findByUser($user);
    }

    public function getForUser(int $id, User $user): Subscription
    {
        $subscription = $this->subscriptionRepository->findOneByIdAndUser($id, $user);

        if (!$subscription) {
            throw new NotFoundHttpException('Subscription not found.');
        }

        return $subscription;
    }

    public function create(User $user, SubscriptionUpsertRequest $dto): Subscription
    {
        $this->validateDto($dto);

        return $this->entityManager->wrapInTransaction(function () use ($user, $dto): Subscription {
            $this->freePlanLimit->assertCanSave($user, null, $dto->status);
            $this->assertCanChooseReminderTiming($user, null, $dto);

            $subscription = new Subscription();
            $subscription->setUser($user);

            $this->mapDto($subscription, $dto);
            $this->entityManager->persist($subscription);
            $this->entityManager->flush();

            return $subscription;
        });
    }

    public function update(Subscription $subscription, SubscriptionUpsertRequest $dto): Subscription
    {
        $this->validateDto($dto);

        return $this->entityManager->wrapInTransaction(function () use ($subscription, $dto): Subscription {
            $user = $subscription->getUser();
            if (null !== $user) {
                $this->freePlanLimit->assertCanSave($user, $subscription, $dto->status);
                $this->assertCanChooseReminderTiming($user, $subscription->getReminderLeadDays(), $dto);
                $now = $this->clock->now();
                $today = UserTime::today($user, $now);
                $createdOn = UserTime::today($user, $subscription->getCreatedAt() ?? $now);
                $subscription->recordPriceChange($this->priceTermsOf($dto), $today, $createdOn);
                $subscription->recordPayerChange($dto->b2b && $dto->paidPersonally, $today, $createdOn);
            }

            $this->mapDto($subscription, $dto);
            $this->entityManager->flush();

            return $subscription;
        });
    }

    /** Removes a price change the owner says was a correction. */
    public function removePriceChange(Subscription $subscription, int $priceChangeId): Subscription
    {
        if (!$subscription->removePriceChange($priceChangeId)) {
            throw new NotFoundHttpException('Price change not found.');
        }
        $this->entityManager->flush();

        return $subscription;
    }

    /**
     * @throws ConflictHttpException when the subscription is cancelled (nothing left to decide)
     */
    public function flagForReview(Subscription $subscription, ?string $note): Subscription
    {
        if (Subscription::STATUS_CANCELLED === $subscription->getStatus()) {
            throw new ConflictHttpException("A cancelled subscription doesn't need a review.");
        }
        $subscription->flagForReview(new \DateTimeImmutable(), $note);
        $this->entityManager->flush();

        return $subscription;
    }

    public function clearReviewFlag(Subscription $subscription): Subscription
    {
        $subscription->clearReviewFlag();
        $this->entityManager->flush();

        return $subscription;
    }

    public function delete(Subscription $subscription, ?bool $usedAndUseful = null): void
    {
        $subscription->setDeletedAt(new \DateTimeImmutable());
        $subscription->setCancelledAt(new \DateTimeImmutable());
        $subscription->setStatus('cancelled');
        $subscription->setDeletedUseful($usedAndUseful);
        $subscription->clearReviewFlag();
        $this->entityManager->flush();
    }

    /**
     * Choosing when a reminder goes out is a paid feature. Sending back the stored choice unchanged is
     * always allowed, so an account that lost its paid features can still edit the subscription.
     */
    private function assertCanChooseReminderTiming(User $user, ?int $stored, SubscriptionUpsertRequest $dto): void
    {
        if ($dto->reminderLeadDays !== $stored && null !== $dto->reminderLeadDays && !$user->hasPaidFeatures()) {
            throw new AccessDeniedHttpException('Choosing when you\'re reminded comes with the one-time unlock.');
        }
    }

    private function validateDto(SubscriptionUpsertRequest $dto): void
    {
        $violations = $this->validator->validate($dto);

        if (count($violations) > 0) {
            throw new ApiValidationException($violations);
        }
    }

    private function mapDto(Subscription $subscription, SubscriptionUpsertRequest $dto): void
    {
        $subscription->setServiceName(trim((string) $dto->serviceName));
        $terms = $this->priceTermsOf($dto);
        $subscription->setAmount($terms->amount);
        $subscription->setCurrency($terms->currency);
        $subscription->setBillingCadence($terms->cadence);
        $subscription->setCategory(null !== $dto->category ? trim($dto->category) : null);
        $subscription->setStartedAt($this->parseDate($dto->startedAt));
        $subscription->setNextBillingDate($this->parseDate($dto->nextBillingDate));
        $subscription->setNotes(null !== $dto->notes ? trim($dto->notes) : null);
        $subscription->setManageUrl($dto->manageUrl);
        $subscription->setStatus($dto->status);
        $subscription->setAutoRenew($dto->autoRenew);
        $subscription->setB2b($dto->b2b);
        $subscription->setPaidPersonally($dto->paidPersonally);
        $subscription->setReminderLeadDays($dto->reminderLeadDays);
        // A size sent without householdShared is ignored, so turning sharing off always clears it.
        $subscription->setHouseholdSharing($dto->householdShared ? $dto->householdSize : null);
        $subscription->setCancelledAt($this->parseDate($dto->cancelledAt));
        $subscription->setResumesOn(Subscription::STATUS_PAUSED === $dto->status ? $this->parseDate($dto->resumesOn) : null);
        // Cancelling is the answer to a review.
        if (Subscription::STATUS_CANCELLED === $dto->status) {
            $subscription->clearReviewFlag();
        }

        $subscription->setTrialEndsAt($this->parseDate($dto->trialEndsAt));
    }

    private function priceTermsOf(SubscriptionUpsertRequest $dto): PriceTerms
    {
        return new PriceTerms(
            number_format((float) $dto->amount, 2, '.', ''),
            strtoupper((string) $dto->currency),
            (string) $dto->billingCadence,
        );
    }

    private function parseDate(?string $value): ?\DateTimeImmutable
    {
        if (null === $value || '' === $value) {
            return null;
        }

        $date = \DateTimeImmutable::createFromFormat('Y-m-d', $value);

        if (!$date) {
            throw new BadRequestHttpException(sprintf('Invalid date value "%s". Expected format: Y-m-d.', $value));
        }

        return $date;
    }
}
