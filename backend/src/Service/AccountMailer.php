<?php

declare(strict_types=1);

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

/**
 * Account-related notification emails. Delivery failures are logged and never surfaced,
 * so API responses cannot differ based on whether an email was sent.
 */
final readonly class AccountMailer
{
    private const string FROM = 'noreply@valutir.com';

    public function __construct(
        private MailerInterface $mailer,
        private LoggerInterface $logger,
        #[Autowire('%frontend_url%')] private string $frontendUrl,
    ) {
    }

    public function sendEmailChangeConfirmation(string $newEmail, string $rawToken): void
    {
        $link = $this->url('/confirm-email?token='.rawurlencode($rawToken));

        $this->send($newEmail, 'Confirm your new ValuTir email address', <<<TEXT
            You asked to use this address for your ValuTir account.

            Confirm the change within 24 hours: {$link}

            If you didn't ask for this, ignore this email. Nothing will change.
            TEXT);
    }

    public function sendEmailChangedNotice(string $previousEmail, string $newEmail): void
    {
        $resetLink = $this->url('/request-password-reset');

        $this->send($previousEmail, 'Your ValuTir email address was changed', <<<TEXT
            The email address for your ValuTir account was changed to {$newEmail}, and every device was signed out.

            If you didn't make this change, reset your password straight away: {$resetLink}
            TEXT);
    }

    public function sendAccountDeletedNotice(string $email): void
    {
        $this->send($email, 'Your ValuTir account was deleted', <<<TEXT
            Your ValuTir account and all of its subscriptions have been permanently deleted.

            You're welcome back any time.
            TEXT);
    }

    private function url(string $path): string
    {
        return rtrim($this->frontendUrl, '/').$path;
    }

    private function send(string $to, string $subject, string $text): void
    {
        try {
            $this->mailer->send((new Email())->from(self::FROM)->to($to)->subject($subject)->text($text));
        } catch (TransportExceptionInterface $exception) {
            $this->logger->error('Could not send account email.', [
                'subject' => $subject,
                'exception_class' => $exception::class,
            ]);
        }
    }
}
