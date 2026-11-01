<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\PasswordResetService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class PasswordController extends AbstractController
{
    #[Route('/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $name = $data['name'] ?? null;

        if (!$email || !$password || !$name) {
            return new JsonResponse(['error' => 'Email, password, and name are required'], 400);
        }

        $existingUser = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            return new JsonResponse(['error' => 'Email already registered'], 409);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setName($name);
        $user->setRoles(['ROLE_USER']);
        $user->setPassword($passwordHasher->hashPassword($user, $password));

        $entityManager->persist($user);
        $entityManager->flush();

        return new JsonResponse(['message' => 'User created successfully', 'email' => $user->getEmail()], 201);
    }

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

        $user = $userRepository->findOneBy(['email' => $email]);
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
        #[Autowire(service: 'limiter.password_reset_submit')] RateLimiterFactory $rateLimiterFactory,
    ): JsonResponse {
        $limit = $rateLimiterFactory->create(hash('sha256', $request->getClientIp() ?? 'unknown'))->consume();
        if (!$limit->isAccepted()) {
            return $this->rateLimitedResponse($limit->getRetryAfter()->getTimestamp());
        }

        $data = json_decode($request->getContent(), true);
        $token = is_array($data) ? ($data['token'] ?? null) : null;
        $newPassword = is_array($data) ? ($data['newPassword'] ?? null) : null;

        if (!is_string($token) || !is_string($newPassword) || strlen($newPassword) < 8 || strlen($newPassword) > 4096) {
            return new JsonResponse(['error' => 'A valid token and password of at least 8 characters are required'], 400);
        }

        if (!$passwordResetService->resetPassword($token, $newPassword)) {
            return new JsonResponse(['error' => 'The password reset link is invalid or expired'], 400);
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
