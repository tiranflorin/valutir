<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Service\TurnstileVerificationService;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

/**
 * The contact form's happy path. Turnstile's request and response rules are covered by TurnstileVerificationServiceTest.
 */
final class ContactControllerTest extends WebTestCase
{
    private const string VAR = 'CONTACT_RECIPIENT';

    protected function tearDown(): void
    {
        unset($_SERVER[self::VAR], $_ENV[self::VAR]);
        parent::tearDown();
    }

    public function testVerifiedSubmissionIsSentToConfiguredRecipient(): void
    {
        $_SERVER[self::VAR] = $_ENV[self::VAR] = 'feedback@example.test';

        $client = static::createClient();
        $container = static::getContainer();

        $turnstileVerifier = new TurnstileVerificationService(
            new MockHttpClient(new MockResponse(json_encode([
                'success' => true,
                'action' => 'contact',
                'hostname' => 'localhost',
            ], JSON_THROW_ON_ERROR))),
            'test-secret',
            '',
        );
        $container->set(TurnstileVerificationService::class, $turnstileVerifier);

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())
            ->method('send')
            ->with(self::callback(static function (Email $email): bool {
                self::assertSame(
                    ['feedback@example.test'],
                    array_map(static fn (Address $address): string => $address->getAddress(), $email->getTo()),
                );
                self::assertSame(
                    ['sender@example.test'],
                    array_map(static fn (Address $address): string => $address->getAddress(), $email->getReplyTo()),
                );
                self::assertSame('ValuTir contact form message', $email->getSubject());
                self::assertStringContainsString('From: <sender@example.test>.', (string) $email->getTextBody());
                self::assertStringContainsString('Please add dark mode.', (string) $email->getTextBody());
                self::assertStringContainsString('<a href="mailto:sender@example.test"', (string) $email->getHtmlBody());

                return true;
            }));
        $container->set(MailerInterface::class, $mailer);

        $client->request(
            'POST',
            '/api/contact',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'sender@example.test',
                'message' => 'Please add dark mode.',
                'website' => '',
                'turnstileToken' => 'valid-token',
            ], JSON_THROW_ON_ERROR),
        );

        self::assertResponseIsSuccessful();
        self::assertSame(
            ['message' => 'Your message has been successfully sent.'],
            json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR),
        );
    }
}
