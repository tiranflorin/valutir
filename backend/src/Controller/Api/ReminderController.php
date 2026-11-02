<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Reminder\UnsubscribeToken;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ReminderController extends AbstractController
{
    public function __construct(
        private readonly UnsubscribeToken $unsubscribeToken,
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * Public: the signed token from the reminder email is the credential. POST only (one-click
     * unsubscribe from mail clients posts "List-Unsubscribe=One-Click" to this URL).
     */
    #[Route('/api/reminders/unsubscribe', name: 'api_reminders_unsubscribe', methods: ['POST'])]
    public function unsubscribe(Request $request): JsonResponse
    {
        $userId = $this->unsubscribeToken->userId($request->query->getString('token'));
        $user = null === $userId ? null : $this->userRepository->find($userId);
        if (null === $user) {
            return $this->json(['message' => 'This unsubscribe link is invalid.'], Response::HTTP_BAD_REQUEST);
        }

        $user->setRemindersEnabled(false);
        $this->entityManager->flush();
        $this->logger->info('Payment reminders turned off from an email link.', ['user_id' => $user->getId()]);

        return $this->json(['message' => "You won't get payment reminder emails anymore. You can turn them back on in Preferences."]);
    }
}
