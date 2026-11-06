<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ReviewFlagRequest;
use App\Dto\SubscriptionUpsertRequest;
use App\Entity\Subscription;
use App\Entity\User;
use App\Exception\ApiValidationException;
use App\Service\SubscriptionService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Exception\ExceptionInterface as SerializerExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/subs')]
final class SubsController extends AbstractController
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('', name: 'api_subs_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $user = $this->requireUser();

        $items = array_map(
            static fn (Subscription $subscription): array => $subscription->toArray(),
            $this->subscriptionService->listForUser($user)
        );

        return $this->json($items);
    }

    #[Route('/{id}', name: 'api_subs_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $subscription = $this->subscriptionService->getForUser($id, $user);

        return $this->json($subscription->toArray());
    }

    #[Route('', name: 'api_subs_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $dto = $this->deserializeRequest($request);

        $subscription = $this->subscriptionService->create($user, $dto);

        return $this->json($subscription->toArray(), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_subs_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $dto = $this->deserializeRequest($request);
        $subscription = $this->subscriptionService->getForUser($id, $user);
        $subscription = $this->subscriptionService->update($subscription, $dto);

        return $this->json($subscription->toArray());
    }

    /** Flags the subscription for review (it stays as it is: still charged and reminded), or updates the note. */
    #[Route('/{id}/review', name: 'api_subs_review_flag', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function flagForReview(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        try {
            /** @var ReviewFlagRequest $dto */
            $dto = $this->serializer->deserialize('' === $request->getContent() ? '{}' : $request->getContent(), ReviewFlagRequest::class, 'json');
        } catch (SerializerExceptionInterface|\JsonException $e) {
            throw new BadRequestHttpException('Invalid JSON payload.', $e);
        }
        $violations = $this->validator->validate($dto);
        if (\count($violations) > 0) {
            throw new ApiValidationException($violations);
        }

        $subscription = $this->subscriptionService->getForUser($id, $user);

        return $this->json($this->subscriptionService->flagForReview($subscription, $dto->note)->toArray());
    }

    #[Route('/{id}/review', name: 'api_subs_review_clear', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function clearReview(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $subscription = $this->subscriptionService->getForUser($id, $user);

        return $this->json($this->subscriptionService->clearReviewFlag($subscription)->toArray());
    }

    #[Route('/{id}', name: 'api_subs_delete', methods: ['DELETE'])]
    public function delete(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $subscription = $this->subscriptionService->getForUser($id, $user);

        $payload = $request->toArray();
        $usedAndUseful = $payload['usedAndUseful'] ?? null;
        if (!is_bool($usedAndUseful)) {
            return $this->json([
                'message' => 'The usedAndUseful field is required and must be a boolean.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $this->subscriptionService->delete($subscription, $usedAndUseful);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    private function requireUser(): User
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            throw $this->createAccessDeniedException('Unauthorized');
        }

        return $user;
    }

    private function deserializeRequest(Request $request): SubscriptionUpsertRequest
    {
        try {
            /** @var SubscriptionUpsertRequest $dto */
            $dto = $this->serializer->deserialize(
                $request->getContent(),
                SubscriptionUpsertRequest::class,
                'json'
            );
        } catch (SerializerExceptionInterface|\JsonException $e) {
            throw new BadRequestHttpException('Invalid JSON payload.', $e);
        }

        return $dto;
    }
}
