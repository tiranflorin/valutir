<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Payment\CheckoutService;
use App\Payment\FreePlanLimit;
use App\Payment\InvalidWebhookException;
use App\Payment\StripeWebhookHandler;
use App\Payment\StripeWebhookVerifier;
use App\Payment\UnlockOffer;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/billing')]
final class BillingController extends AbstractController
{
    /** Stripe events are a few KB; anything far larger is not from Stripe. */
    private const int MAX_WEBHOOK_BYTES = 262144;

    public function __construct(
        private readonly CheckoutService $checkoutService,
        private readonly FreePlanLimit $freePlanLimit,
        private readonly StripeWebhookVerifier $webhookVerifier,
        private readonly StripeWebhookHandler $webhookHandler,
        private readonly LoggerInterface $logger,
        #[Autowire(service: 'limiter.billing_checkout')] private readonly RateLimiterFactory $checkoutLimiter,
    ) {
    }

    #[Route('', name: 'api_billing_show', methods: ['GET'])]
    public function show(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json([
            'unlocked' => $user->isUnlocked(),
            'unlockedAt' => $user->getUnlockedAt()?->format(\DATE_ATOM),
            'checkoutAvailable' => $this->checkoutService->isAvailable(),
            'price' => ['amountInCents' => UnlockOffer::AMOUNT_IN_CENTS, 'currency' => strtoupper(UnlockOffer::CURRENCY), 'taxInclusive' => true],
            'freeActiveLimit' => FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS,
            'activeCount' => $this->freePlanLimit->countActive($user),
        ]);
    }

    #[Route('/checkout', name: 'api_billing_checkout', methods: ['POST'])]
    public function checkout(#[CurrentUser] User $user): JsonResponse
    {
        $limit = $this->checkoutLimiter->create('user-'.$user->getId())->consume();
        if (!$limit->isAccepted()) {
            return $this->json(
                ['message' => 'Too many checkout attempts. Please try again later.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) max(1, $limit->getRetryAfter()->getTimestamp() - time())],
            );
        }

        return $this->json(['url' => $this->checkoutService->start($user)]);
    }

    /**
     * Public: Stripe calls it, and the signature over the raw body is the credential.
     */
    #[Route('/webhook', name: 'api_billing_webhook', methods: ['POST'])]
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        if (\strlen($payload) > self::MAX_WEBHOOK_BYTES) {
            return $this->json(['message' => 'Payload too large.'], Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }

        try {
            $event = $this->webhookVerifier->verify($payload, $request->headers->get('Stripe-Signature'));
        } catch (InvalidWebhookException $e) {
            $this->logger->warning('Rejected Stripe webhook.', ['reason' => $e->getMessage(), 'client_ip' => $request->getClientIp()]);

            return $this->json(['message' => 'Invalid webhook.'], Response::HTTP_BAD_REQUEST);
        }

        // A failure here becomes a 500, so Stripe retries the event later.
        $this->webhookHandler->handle($event);

        return $this->json(['received' => true]);
    }
}
