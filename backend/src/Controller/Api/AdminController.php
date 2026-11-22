<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Admin\OperatorReport;
use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * The operator's read-only admin page. Only ROLE_ADMIN reaches it: security.yaml's access_control
 * guards every /api/admin path.
 */
#[Route('/api/admin')]
final class AdminController extends AbstractController
{
    private const int MAX_EMAIL_LENGTH = 180;

    public function __construct(private readonly OperatorReport $report)
    {
    }

    #[Route('/overview', name: 'api_admin_overview', methods: ['GET'])]
    public function overview(#[CurrentUser] User $admin): JsonResponse
    {
        return $this->json($this->report->overview($admin));
    }

    #[Route('/accounts', name: 'api_admin_account', methods: ['GET'])]
    public function account(#[CurrentUser] User $admin, Request $request): JsonResponse
    {
        $email = trim($request->query->getString('email'));
        if ('' === $email || \strlen($email) > self::MAX_EMAIL_LENGTH || false === filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            return $this->json(['message' => 'Enter a valid email address.'], Response::HTTP_BAD_REQUEST);
        }

        $account = $this->report->account($admin, $email);

        return null === $account
            ? $this->json(['message' => 'No account uses that email.'], Response::HTTP_NOT_FOUND)
            : $this->json($account);
    }
}
