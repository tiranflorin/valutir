<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\AccountService;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\JWTDecodeFailureException;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\MissingClaimException;
use Lexik\Bundle\JWTAuthenticationBundle\Services\BlockedTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\TokenExtractor\TokenExtractorInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Server-side logout for stateless JWTs. Both endpoints require a valid token.
 */
#[Route('/api/logout')]
final class SessionController extends AbstractController
{
    public function __construct(
        private readonly TokenExtractorInterface $tokenExtractor,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly BlockedTokenManagerInterface $blockedTokenManager,
        private readonly AccountService $accountService,
    ) {
    }

    /**
     * Revokes the token used for this request (this device only) until it would have expired.
     */
    #[Route('', name: 'api_logout', methods: ['POST'])]
    public function logout(Request $request): JsonResponse
    {
        $rawToken = $this->tokenExtractor->extract($request);

        try {
            if (\is_string($rawToken)) {
                $this->blockedTokenManager->add($this->jwtManager->parse($rawToken));
            }
        } catch (JWTDecodeFailureException|MissingClaimException) {
            // The firewall already authenticated this token; nothing else to revoke.
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Revokes every token issued to the user so far, on every device.
     */
    #[Route('/all', name: 'api_logout_all', methods: ['POST'])]
    public function logoutEverywhere(#[CurrentUser] User $user): JsonResponse
    {
        $this->accountService->signOutEverywhere($user);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
