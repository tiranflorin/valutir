<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Mail\EmailFactory;
use App\Service\TurnstileVerificationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

final class ContactController extends AbstractController
{
    #[Route('/api/contact', name: 'api_contact_submit', methods: ['POST'])]
    public function submit(
        Request $request,
        TurnstileVerificationService $turnstileVerifier,
        MailerInterface $mailer,
        EmailFactory $emails,
        #[Autowire('%contact_recipient%')] string $contactRecipient,
        #[Autowire(service: 'limiter.contact_submit')] RateLimiterFactory $rateLimiterFactory,
    ): JsonResponse {
        $limit = $rateLimiterFactory->create(hash('sha256', $request->getClientIp() ?? 'unknown'))->consume();
        if (!$limit->isAccepted()) {
            $retryAfter = max(1, $limit->getRetryAfter()->getTimestamp() - time());

            return $this->json(
                ['message' => 'Too many contact attempts. Please try again later.'],
                429,
                ['Retry-After' => (string) $retryAfter],
            );
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['message' => 'Invalid JSON payload.'], 400);
        }

        $email = $data['email'] ?? null;
        $message = $data['message'] ?? null;
        $honeypot = $data['website'] ?? null;
        $token = $data['turnstileToken'] ?? null;

        if (!is_string($email) || strlen($email) > 254 || false === filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['message' => 'Enter a valid email address.'], 400);
        }
        if (!is_string($message) || '' === trim($message) || mb_strlen($message) > 10000) {
            return $this->json(['message' => 'Message is required and must be at most 10,000 characters.'], 400);
        }
        if (!is_string($honeypot ?? '') || !is_string($token) || strlen($token) > 2048) {
            return $this->json(['message' => 'Invalid contact submission.'], 400);
        }

        // Quietly accept honeypot submissions so automated clients do not learn the check.
        if ('' !== trim($honeypot ?? '')) {
            return $this->json([
                'message' => 'Your message has been sent.',
            ]);
        }

        if (!$turnstileVerifier->isConfigured()) {
            return $this->json(['message' => 'Bot verification is not configured.'], 503);
        }
        if (!$turnstileVerifier->verify($token, $request->getClientIp())) {
            return $this->json(['message' => 'Bot verification failed. Please complete it and try again.'], 400);
        }

        if ('' === trim($contactRecipient) || false === filter_var($contactRecipient, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['message' => 'Contact message delivery is not configured. Please try again later.'], 503);
        }

        $mailer->send($emails
            ->create('email/contact_message.html.twig', $contactRecipient, 'ValuTir contact form message', [
                'from_email' => $email,
                'message' => $message,
            ])
            ->replyTo($email));

        return $this->json(['message' => 'Your message has been successfully sent.']);
    }
}
