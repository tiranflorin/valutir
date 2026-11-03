<?php

declare(strict_types=1);

namespace App\Mail;

use Symfony\Bridge\Twig\Mime\BodyRenderer;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;

/**
 * Builds every email ValuTir sends from a template in templates/email/ that extends
 * email/layout.html.twig, so all of them share one look. The message is rendered here (HTML, plus a
 * plain-text part generated from it by EmailTextConverter), so callers and tests get the final content.
 *
 * Templates use Twig's HTML autoescaping, so user-provided text (names, service names, contact
 * messages) can't inject markup or links. Pass URLs built by the server only.
 */
final readonly class EmailFactory
{
    public const string FROM_ADDRESS = 'noreply@valutir.com';
    public const string FROM_NAME = 'ValuTir';
    /** Served by the frontend (Cloudflare); PNG because Gmail and Outlook don't show SVG. */
    public const string LOGO_PATH = '/brand/email-logo.png';

    private BodyRenderer $bodyRenderer;

    public function __construct(
        Environment $twig,
        #[Autowire('%frontend_url%')] private string $frontendUrl,
    ) {
        $this->bodyRenderer = new BodyRenderer($twig, [], new EmailTextConverter());
    }

    /**
     * @param string               $template e.g. "email/verify_email.html.twig"
     * @param array<string, mixed> $context  template variables; app_url, logo_url and subject are added
     */
    public function create(string $template, string $to, string $subject, array $context = []): Email
    {
        $email = (new TemplatedEmail())
            ->from(new Address(self::FROM_ADDRESS, self::FROM_NAME))
            ->to($to)
            ->subject($subject)
            ->htmlTemplate($template)
            ->context($context + [
                'app_url' => $this->appUrl(),
                'logo_url' => $this->appUrl(self::LOGO_PATH),
                'subject' => $subject,
            ]);

        $this->bodyRenderer->render($email);

        return $email;
    }

    /** A link into the app: the frontend origin plus a path. */
    public function appUrl(string $path = ''): string
    {
        return rtrim($this->frontendUrl, '/').$path;
    }
}
