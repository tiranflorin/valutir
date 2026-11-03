<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\VerifyEmailRequest;
use App\Entity\User;
use App\Exception\ApiValidationException;
use App\Service\EmailVerificationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\RateLimiter\RateLimit;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Serializer\Exception\ExceptionInterface as SerializerExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class EmailVerificationController extends AbstractController
{
    public function __construct(
        private readonly EmailVerificationService $verificationService,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        #[Autowire(service: 'limiter.email_verification_confirm')] private readonly RateLimiterFactory $confirmLimiter,
        #[Autowire(service: 'limiter.email_verification_resend')] private readonly RateLimiterFactory $resendLimiter,
    ) {
    }

    /**
     * Public: the emailed link may be opened on any device, signed in or not. The token is the credential.
     */
    #[Route('/api/register/verify-email', name: 'api_register_verify_email', methods: ['POST'])]
    public function verify(Request $request): JsonResponse
    {
        $limit = $this->confirmLimiter->create(hash('sha256', $request->getClientIp() ?? 'unknown'))->consume();
        if (!$limit->isAccepted()) {
            return $this->tooManyAttempts($limit);
        }

        try {
            $dto = $this->serializer->deserialize($request->getContent(), VerifyEmailRequest::class, 'json');
        } catch (SerializerExceptionInterface $exception) {
            throw new BadRequestHttpException('Invalid JSON payload.', $exception);
        }
        $violations = $this->validator->validate($dto);
        if (\count($violations) > 0) {
            throw new ApiValidationException($violations);
        }

        if (!$this->verificationService->verify((string) $dto->token)) {
            return $this->json(
                ['message' => 'This verification link is invalid or expired. If you already confirmed your address, you are all set.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        return $this->json(['message' => 'Your email address is confirmed.']);
    }

    #[Route('/api/profile/email/verification', name: 'api_profile_resend_verification', methods: ['POST'])]
    public function resend(#[CurrentUser] User $user): JsonResponse
    {
        if ($user->isEmailVerified()) {
            return $this->json(['message' => 'Your email address is already confirmed.'], Response::HTTP_CONFLICT);
        }

        $limit = $this->resendLimiter->create('user-'.$user->getId())->consume();
        if (!$limit->isAccepted()) {
            return $this->tooManyAttempts($limit);
        }

        $this->verificationService->sendVerification($user);

        return $this->json(
            ['message' => sprintf('We sent a new confirmation link to %s. It works for 24 hours.', $user->getUserIdentifier())],
            Response::HTTP_ACCEPTED,
        );
    }

    private function tooManyAttempts(RateLimit $limit): JsonResponse
    {
        return $this->json(
            ['message' => 'Too many attempts. Please try again later.'],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) max(1, $limit->getRetryAfter()->getTimestamp() - time())],
        );
    }
}
