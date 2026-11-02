<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ResetPasswordRequest;
use App\Exception\ApiValidationException;
use App\Repository\UserRepository;
use App\Service\PasswordResetService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Exception\ExceptionInterface as SerializerExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api')]
final class PasswordController extends AbstractController
{
    #[Route('/reset-password/request', name: 'api_reset_password_request', methods: ['POST'])]
    public function requestReset(
        Request $request,
        UserRepository $userRepository,
        MailerInterface $mailer,
        PasswordResetService $passwordResetService,
        #[Autowire('%frontend_url%')] string $frontendUrl,
        #[Autowire(service: 'limiter.password_reset_request')] RateLimiterFactory $rateLimiterFactory,
    ): JsonResponse {
        $limit = $rateLimiterFactory->create(hash('sha256', $request->getClientIp() ?? 'unknown'))->consume();
        if (!$limit->isAccepted()) {
            return $this->rateLimitedResponse($limit->getRetryAfter()->getTimestamp());
        }

        $data = json_decode($request->getContent(), true);
        $email = is_array($data) ? ($data['email'] ?? null) : null;

        if (!is_string($email) || '' === trim($email)) {
            return new JsonResponse(['error' => 'Email is required'], 400);
        }

        $user = $userRepository->findOneByEmail($email);
        if (null === $user) {
            return new JsonResponse(['message' => 'If your email is registered, you will receive a reset link.']);
        }

        $token = $passwordResetService->createToken($user);
        $resetLink = rtrim($frontendUrl, '/').'/reset-password?token='.rawurlencode($token);
        $escapedResetLink = htmlspecialchars($resetLink, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $emailMsg = (new Email())
            ->from('noreply@valutir.com')
            ->to($user->getEmail())
            ->subject('Password Reset Request')
            ->html("<p>Click the link to reset your password:</p><p><a href='{$escapedResetLink}'>Reset Password</a></p>");

        $mailer->send($emailMsg);

        return new JsonResponse(['message' => 'If your email is registered, you will receive a reset link.']);
    }

    #[Route('/reset-password/new', name: 'api_reset_password_new', methods: ['POST'])]
    public function newPassword(
        Request $request,
        PasswordResetService $passwordResetService,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        #[Autowire(service: 'limiter.password_reset_submit')] RateLimiterFactory $rateLimiterFactory,
    ): JsonResponse {
        $limit = $rateLimiterFactory->create(hash('sha256', $request->getClientIp() ?? 'unknown'))->consume();
        if (!$limit->isAccepted()) {
            return $this->rateLimitedResponse($limit->getRetryAfter()->getTimestamp());
        }

        try {
            $dto = $serializer->deserialize($request->getContent(), ResetPasswordRequest::class, 'json');
        } catch (SerializerExceptionInterface) {
            return new JsonResponse(['message' => 'Invalid JSON payload.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $validator->validate($dto);
        if (\count($violations) > 0) {
            throw new ApiValidationException($violations);
        }

        if (!$passwordResetService->resetPassword((string) $dto->token, (string) $dto->newPassword)) {
            return new JsonResponse(['message' => 'The password reset link is invalid or expired.'], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse(['message' => 'Password reset successful']);
    }

    private function rateLimitedResponse(int $retryAfterTimestamp): JsonResponse
    {
        $retryAfter = max(1, $retryAfterTimestamp - time());

        return new JsonResponse(
            ['error' => 'Too many password reset attempts. Please try again later.'],
            429,
            ['Retry-After' => (string) $retryAfter],
        );
    }
}
