<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ChangeEmailRequest;
use App\Dto\ChangePasswordRequest;
use App\Dto\ConfirmEmailChangeRequest;
use App\Dto\DeleteAccountRequest;
use App\Dto\UpdateProfileRequest;
use App\Entity\User;
use App\Exception\ApiValidationException;
use App\Service\AccountService;
use App\Service\EmailChangeService;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Serializer\Exception\ExceptionInterface as SerializerExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/profile')]
final class ProfileController extends AbstractController
{
    public function __construct(
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        private readonly AccountService $accountService,
        private readonly EmailChangeService $emailChangeService,
        private readonly JWTTokenManagerInterface $jwtManager,
        #[Autowire(service: 'limiter.account_password_check')] private readonly RateLimiterFactory $passwordCheckLimiter,
        #[Autowire(service: 'limiter.email_change_confirm')] private readonly RateLimiterFactory $emailConfirmLimiter,
    ) {
    }

    #[Route('', name: 'api_profile_show', methods: ['GET'])]
    public function show(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json($this->accountService->describe($user));
    }

    #[Route('', name: 'api_profile_update', methods: ['PATCH'])]
    public function update(#[CurrentUser] User $user, Request $request): JsonResponse
    {
        $dto = $this->deserializeAndValidate($request, UpdateProfileRequest::class);
        $this->accountService->updateProfile($user, $dto);

        return $this->json($this->accountService->describe($user));
    }

    #[Route('/password', name: 'api_profile_change_password', methods: ['PATCH'])]
    public function changePassword(#[CurrentUser] User $user, Request $request): JsonResponse
    {
        if (null !== $tooMany = $this->rejectIfTooManyPasswordFailures($user)) {
            return $tooMany;
        }
        $dto = $this->deserializeAndValidate($request, ChangePasswordRequest::class);
        if (!$this->accountService->isCurrentPassword($user, (string) $dto->currentPassword)) {
            return $this->incorrectPassword($user);
        }

        $this->accountService->changePassword($user, (string) $dto->newPassword);

        // Other devices are signed out; keep this one signed in with a fresh token.
        return $this->json([
            'message' => 'Password updated. Other devices have been signed out.',
            'token' => $this->jwtManager->create($user),
        ]);
    }

    #[Route('/email', name: 'api_profile_change_email', methods: ['POST'])]
    public function requestEmailChange(#[CurrentUser] User $user, Request $request): JsonResponse
    {
        if (null !== $tooMany = $this->rejectIfTooManyPasswordFailures($user)) {
            return $tooMany;
        }
        $dto = $this->deserializeAndValidate($request, ChangeEmailRequest::class);
        if (!$this->accountService->isCurrentPassword($user, (string) $dto->currentPassword)) {
            return $this->incorrectPassword($user);
        }
        if (User::normalizeEmail((string) $dto->newEmail) === $user->getUserIdentifier()) {
            return $this->json(['message' => 'This is already your email address.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->emailChangeService->requestChange($user, (string) $dto->newEmail);

        // Same response whether or not the address is already registered (no account enumeration).
        return $this->json(
            ['message' => 'If that address can be used, we sent a confirmation link to it. Your email changes once you confirm.'],
            Response::HTTP_ACCEPTED,
        );
    }

    /**
     * Public: the emailed link may be opened on any device, signed in or not. The token is the credential.
     */
    #[Route('/email/confirm', name: 'api_profile_confirm_email', methods: ['POST'])]
    public function confirmEmailChange(Request $request): JsonResponse
    {
        $limit = $this->emailConfirmLimiter->create(hash('sha256', $request->getClientIp() ?? 'unknown'))->consume();
        if (!$limit->isAccepted()) {
            return $this->tooManyAttempts($limit->getRetryAfter());
        }
        $dto = $this->deserializeAndValidate($request, ConfirmEmailChangeRequest::class);

        if (!$this->emailChangeService->confirmChange((string) $dto->token)) {
            return $this->json(['message' => 'The confirmation link is invalid or expired.'], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['message' => 'Your email address has been updated. Sign in with your new address.']);
    }

    #[Route('', name: 'api_profile_delete', methods: ['DELETE'])]
    public function delete(#[CurrentUser] User $user, Request $request): JsonResponse
    {
        if (null !== $tooMany = $this->rejectIfTooManyPasswordFailures($user)) {
            return $tooMany;
        }
        $dto = $this->deserializeAndValidate($request, DeleteAccountRequest::class);
        if (!$this->accountService->isCurrentPassword($user, (string) $dto->currentPassword)) {
            return $this->incorrectPassword($user);
        }

        $this->accountService->deleteAccount($user);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * @template T of object
     *
     * @param class-string<T> $class
     *
     * @return T
     */
    private function deserializeAndValidate(Request $request, string $class): object
    {
        try {
            $dto = $this->serializer->deserialize($request->getContent(), $class, 'json');
        } catch (SerializerExceptionInterface $exception) {
            throw new BadRequestHttpException('Invalid JSON payload.', $exception);
        }

        $violations = $this->validator->validate($dto);
        if (\count($violations) > 0) {
            throw new ApiValidationException($violations);
        }

        return $dto;
    }

    /**
     * Limits current-password guesses made with a (possibly stolen) valid token.
     * Only failed checks count, so normal use of the settings page is never blocked.
     */
    private function rejectIfTooManyPasswordFailures(User $user): ?JsonResponse
    {
        // Consuming zero tokens only reads the current state.
        $limit = $this->passwordCheckLimiter->create('user-'.$user->getId())->consume(0);

        return $limit->getRemainingTokens() > 0 ? null : $this->tooManyAttempts($limit->getRetryAfter());
    }

    private function tooManyAttempts(\DateTimeImmutable $retryAfter): JsonResponse
    {
        return $this->json(
            ['message' => 'Too many attempts. Please try again later.'],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) max(1, $retryAfter->getTimestamp() - time())],
        );
    }

    private function incorrectPassword(User $user): JsonResponse
    {
        $this->passwordCheckLimiter->create('user-'.$user->getId())->consume();

        return $this->json(['message' => 'Current password is incorrect.'], Response::HTTP_BAD_REQUEST);
    }
}
