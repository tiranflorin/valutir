<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
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
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return new JsonResponse(['error' => 'Email is required'], 400);
        }

        $user = $userRepository->findOneBy(['email' => $email]);
        if (!$user) {
            return new JsonResponse(['message' => 'If your email is registered, you will receive a reset link.']);
        }

        $token = bin2hex(random_bytes(32));
        $resetLink = "http://localhost:5173/reset-password?token={$token}";

        $emailMsg = (new Email())
            ->from('noreply@valutir.com')
            ->to($user->getEmail())
            ->subject('Password Reset Request')
            ->html("<p>Click the link to reset your password:</p><p><a href='{$resetLink}'>Reset Password</a></p>");

        $mailer->send($emailMsg);

        return new JsonResponse(['message' => 'If your email is registered, you will receive a reset link.']);
    }

    #[Route('/reset-password/new', name: 'api_reset_password_new', methods: ['POST'])]
    public function newPassword(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $token = $data['token'] ?? null;
        $newPassword = $data['newPassword'] ?? null;

        if (!$token || !$newPassword) {
            return new JsonResponse(['error' => 'Token and newPassword are required'], 400);
        }

        // TODO: validate token from DB in future iteration
        return new JsonResponse(['message' => 'Password reset successful']);
    }
}
