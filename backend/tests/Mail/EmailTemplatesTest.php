<?php

declare(strict_types=1);

namespace App\Tests\Mail;

use App\Mail\EmailFactory;
use App\Service\AccountMailer;
use App\Tests\Support\Emails;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\RawMessage;

/**
 * Every account email shares the branded layout and has working links in both parts.
 * (Reminder and contact emails are covered by ReminderMailerTest and ContactControllerTest.).
 */
final class EmailTemplatesTest extends TestCase
{
    private const string TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    /**
     * @return iterable<string, array{\Closure(AccountMailer): void, string, string}>
     */
    public static function accountEmails(): iterable
    {
        yield 'email verification' => [
            static fn (AccountMailer $m) => $m->sendEmailVerification('ada@example.test', self::TOKEN),
            'Confirm your email address for ValuTir',
            'http://frontend.test/verify-email?token='.self::TOKEN,
        ];
        yield 'existing account' => [
            static fn (AccountMailer $m) => $m->sendExistingAccountNotice('ada@example.test'),
            'Someone tried to create a ValuTir account with your email',
            'http://frontend.test/login',
        ];
        yield 'password reset' => [
            static fn (AccountMailer $m) => $m->sendPasswordReset('ada@example.test', self::TOKEN),
            'Reset your ValuTir password',
            'http://frontend.test/reset-password?token='.self::TOKEN,
        ];
        yield 'email change confirmation' => [
            static fn (AccountMailer $m) => $m->sendEmailChangeConfirmation('ada@example.test', self::TOKEN),
            'Confirm your new ValuTir email address',
            'http://frontend.test/confirm-email?token='.self::TOKEN,
        ];
        yield 'email changed notice' => [
            static fn (AccountMailer $m) => $m->sendEmailChangedNotice('ada@example.test', 'new@example.test'),
            'Your ValuTir email address was changed',
            'http://frontend.test/request-password-reset',
        ];
        yield 'account deleted' => [
            static fn (AccountMailer $m) => $m->sendAccountDeletedNotice('ada@example.test'),
            'Your ValuTir account was deleted',
            'http://frontend.test/register',
        ];
    }

    /**
     * @param \Closure(AccountMailer): void $send
     */
    #[DataProvider('accountEmails')]
    public function testUsesTheBrandedLayoutWithRealLinks(\Closure $send, string $subject, string $mainUrl): void
    {
        $email = $this->capture($send);
        $html = (string) $email->getHtmlBody();
        $text = (string) $email->getTextBody();

        self::assertSame($subject, $email->getSubject());
        self::assertSame(EmailFactory::FROM_ADDRESS, $email->getFrom()[0]->getAddress());
        self::assertSame(EmailFactory::FROM_NAME, $email->getFrom()[0]->getName());
        self::assertSame('ada@example.test', $email->getTo()[0]->getAddress());

        // The shared layout: logo (PNG from the app's origin), card, footer.
        self::assertStringContainsString('<img src="http://frontend.test/brand/email-logo.png"', $html);
        self::assertStringContainsString('Track. Control. More value.', $html);
        self::assertStringContainsString('<a href="http://frontend.test/contact"', $html);

        // The main action is a real link in the HTML, and a labelled URL in the text part.
        self::assertStringContainsString('href="'.htmlspecialchars($mainUrl).'"', $html);
        self::assertMatchesRegularExpression('~\]\('.preg_quote($mainUrl, '~').'\)~', $text);

        // Styles are inlined for clients that drop <style>, and nothing is left unrendered.
        self::assertMatchesRegularExpression('~<td class="card-cell" style="[^"]*padding~', $html);
        self::assertStringNotContainsString('{{', $html);
        self::assertStringNotContainsString('{%', $html);
        self::assertStringNotContainsString('email-logo.png', $text, 'The text part leaves the logo out.');
    }

    private function capture(\Closure $send): Email
    {
        $sent = [];
        $mailer = $this->createStub(MailerInterface::class);
        $mailer->method('send')->willReturnCallback(static function (RawMessage $message) use (&$sent): void {
            $sent[] = $message;
        });

        $send(new AccountMailer($mailer, Emails::factory(), new NullLogger()));

        self::assertCount(1, $sent);
        self::assertInstanceOf(Email::class, $sent[0]);

        return $sent[0];
    }
}
