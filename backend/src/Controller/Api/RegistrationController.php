<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\RegisterRequest;
use App\Exception\ApiValidationException;
use App\Service\UserRegistrationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Exception\ExceptionInterface as SerializerExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class RegistrationController extends AbstractController
{
    public function __construct(
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        private readonly UserRegistrationService $registrationService,
        #[Autowire(service: 'limiter.registration')] private readonly RateLimiterFactory $rateLimiterFactory,
    ) {
    }

    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $limit = $this->rateLimiterFactory->create(hash('sha256', $request->getClientIp() ?? 'unknown'))->consume();
        if (!$limit->isAccepted()) {
            return $this->json(
                ['message' => 'Too many registration attempts. Please try again later.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) max(1, $limit->getRetryAfter()->getTimestamp() - time())],
            );
        }

        try {
            $dto = $this->serializer->deserialize($request->getContent(), RegisterRequest::class, 'json');
        } catch (SerializerExceptionInterface) {
            return $this->json(['message' => 'Invalid JSON payload.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $this->validator->validate($dto);
        if (\count($violations) > 0) {
            throw new ApiValidationException($violations);
        }

        $this->registrationService->register($dto);

        // Same response whether or not the email was already registered (no account enumeration).
        return $this->json(
            ['message' => 'Registration received. You can now sign in.'],
            Response::HTTP_ACCEPTED,
        );
    }
}
