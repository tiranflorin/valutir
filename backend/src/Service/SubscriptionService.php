<?php

namespace App\Service;

use App\Dto\SubscriptionUpsertRequest;
use App\Entity\Subscription;
use App\Entity\User;
use App\Exception\ApiValidationException;
use App\Repository\SubscriptionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class SubscriptionService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly SubscriptionRepository $subscriptionRepository,
        private readonly ValidatorInterface $validator,
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

        $subscription = new Subscription();
        $subscription->setUser($user);

        $this->mapDto($subscription, $dto);
        $this->entityManager->persist($subscription);
        $this->entityManager->flush();

        return $subscription;
    }

    public function update(Subscription $subscription, SubscriptionUpsertRequest $dto): Subscription
    {
        $this->validateDto($dto);

        $this->mapDto($subscription, $dto);
        $this->entityManager->flush();

        return $subscription;
    }

    public function delete(Subscription $subscription, ?bool $usedAndUseful = null): void
    {
        $subscription->setDeletedAt(new \DateTimeImmutable());
        $subscription->setCancelledAt(new \DateTimeImmutable());
        $subscription->setStatus(false);
        $subscription->setDeletedUseful($usedAndUseful);
        $this->entityManager->flush();
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
        $subscription->setAmount(number_format((float) $dto->amount, 2, '.', ''));
        $subscription->setCurrency((string) $dto->currency);
        $subscription->setBillingCadence((string) $dto->billingCadence);
        $subscription->setCategory(null !== $dto->category ? trim($dto->category) : null);
        $subscription->setStartedAt($this->parseDate($dto->startedAt));
        $subscription->setNextBillingDate($this->parseDate($dto->nextBillingDate));
        $subscription->setNotes(null !== $dto->notes ? trim($dto->notes) : null);
        $subscription->setPaymentMethod(null !== $dto->paymentMethod ? trim($dto->paymentMethod) : null);
        $subscription->setStatus($dto->status);
        $subscription->setAutoRenew($dto->autoRenew);
        $subscription->setCancelledAt($this->parseDate($dto->cancelledAt));
        $subscription->setTrialEndsAt($this->parseDate($dto->trialEndsAt));
        $subscription->setTrialReminderSentAt($this->parseDateTime($dto->trialReminderSentAt));
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

    private function parseDateTime(?string $value): ?\DateTimeImmutable
    {
        if (null === $value || '' === $value) {
            return null;
        }

        $date = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value);

        if (!$date) {
            throw new BadRequestHttpException(sprintf('Invalid date value "%s". Expected format: Y-m-d H:i:s .', $value));
        }

        return $date;
    }
}
