<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ChangePasswordRequest;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Exception\ExceptionInterface as SerializerExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/profile')]
final class ProfileController extends AbstractController
{
    public function __construct(
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('/password', name: 'api_profile_change_password', methods: ['PATCH'])]
    public function changePassword(Request $request): JsonResponse
    {
        try {
            /** @var ChangePasswordRequest $dto */
            $dto = $this->serializer->deserialize(
                $request->getContent(),
                ChangePasswordRequest::class,
                'json'
            );
        } catch (SerializerExceptionInterface|\JsonException) {
            return $this->json(['message' => 'Invalid JSON payload.'], Response::HTTP_BAD_REQUEST);
        }
        if (!$dto instanceof ChangePasswordRequest) {
            return $this->json(['message' => 'Invalid JSON payload.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()][] = $violation->getMessage();
            }

            return $this->json([
                'message' => 'Validation failed.',
                'errors' => $errors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Authentication required.'], Response::HTTP_UNAUTHORIZED);
        }

        if (!$this->passwordHasher->isPasswordValid($user, (string) $dto->currentPassword)) {
            return $this->json(['message' => 'Current password is incorrect.'], Response::HTTP_BAD_REQUEST);
        }

        $passwordChecks = [
            strlen((string) $dto->newPassword) >= 8,
            1 === preg_match('/[A-Z]/', (string) $dto->newPassword),
            1 === preg_match('/\d/', (string) $dto->newPassword),
            1 === preg_match('/[^A-Za-z0-9]/', (string) $dto->newPassword),
        ];
        if (count(array_filter($passwordChecks)) < 3) {
            return $this->json([
                'message' => 'Use a password that meets at least three of these: 8 characters, an uppercase letter, a number, and a symbol.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->setPassword($this->passwordHasher->hashPassword($user, (string) $dto->newPassword));
        $this->entityManager->flush();

        return $this->json(['message' => 'Password updated successfully.']);
    }
}
