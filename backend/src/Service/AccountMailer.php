<?php

declare(strict_types=1);

namespace App\Service;

use App\Mail\EmailFactory;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;

/**
 * Account-related emails (templates in templates/email/, sharing email/layout.html.twig).
 * Delivery failures are logged and never surfaced, so API responses cannot differ based on
 * whether an email was sent.
 */
final readonly class AccountMailer
{
    public function __construct(
        private MailerInterface $mailer,
        private EmailFactory $emails,
        private LoggerInterface $logger,
    ) {
    }

    public function sendEmailVerification(string $email, string $rawToken): void
    {
        $this->send('email/verify_email.html.twig', $email, 'Confirm your email address for ValuTir', [
            'email_address' => $email,
            'verify_url' => $this->emails->appUrl('/verify-email?token='.rawurlencode($rawToken)),
        ]);
    }

    /** Sent instead of a verification link when someone registers with an address that already has an account. */
    public function sendExistingAccountNotice(string $email): void
    {
        $this->send('email/existing_account.html.twig', $email, 'Someone tried to create a ValuTir account with your email', [
            'login_url' => $this->emails->appUrl('/login'),
            'reset_url' => $this->emails->appUrl('/request-password-reset'),
        ]);
    }

    public function sendPasswordReset(string $email, string $rawToken): void
    {
        $this->send('email/password_reset.html.twig', $email, 'Reset your ValuTir password', [
            'reset_url' => $this->emails->appUrl('/reset-password?token='.rawurlencode($rawToken)),
        ]);
    }

    public function sendEmailChangeConfirmation(string $newEmail, string $rawToken): void
    {
        $this->send('email/email_change_confirm.html.twig', $newEmail, 'Confirm your new ValuTir email address', [
            'email_address' => $newEmail,
            'confirm_url' => $this->emails->appUrl('/confirm-email?token='.rawurlencode($rawToken)),
        ]);
    }

    public function sendEmailChangedNotice(string $previousEmail, string $newEmail): void
    {
        $this->send('email/email_changed.html.twig', $previousEmail, 'Your ValuTir email address was changed', [
            'new_email' => $newEmail,
            'reset_url' => $this->emails->appUrl('/request-password-reset'),
        ]);
    }

    public function sendAccountDeletedNotice(string $email): void
    {
        $this->send('email/account_deleted.html.twig', $email, 'Your ValuTir account was deleted', [
            'register_url' => $this->emails->appUrl('/register'),
        ]);
    }

    /**
     * @param array<string, mixed> $context
     */
    private function send(string $template, string $to, string $subject, array $context): void
    {
        try {
            $this->mailer->send($this->emails->create($template, $to, $subject, $context));
        } catch (TransportExceptionInterface $exception) {
            $this->logger->error('Could not send account email.', [
                'template' => $template,
                'exception_class' => $exception::class,
            ]);
        }
    }
}
