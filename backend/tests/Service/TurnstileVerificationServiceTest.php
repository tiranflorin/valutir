<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\TurnstileVerificationService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class TurnstileVerificationServiceTest extends TestCase
{
    public function testSubmitsTokenToCloudflareAndAcceptsExpectedActionAndHostname(): void
    {
        $requestOptions = null;
        $httpClient = new MockHttpClient(static function (string $method, string $url, array $options) use (&$requestOptions): MockResponse {
            self::assertSame('POST', $method);
            self::assertSame('https://challenges.cloudflare.com/turnstile/v0/siteverify', $url);
            $requestOptions = $options;

            return new MockResponse(json_encode([
                'success' => true,
                'action' => 'contact',
                'hostname' => 'example.test',
            ], JSON_THROW_ON_ERROR));
        });
        $service = new TurnstileVerificationService($httpClient, 'secret-key', 'example.test,localhost');

        self::assertTrue($service->verify('turnstile-token', '192.0.2.10'));
        parse_str($requestOptions['body'], $body);
        self::assertSame('secret-key', $body['secret']);
        self::assertSame('turnstile-token', $body['response']);
        self::assertSame('192.0.2.10', $body['remoteip']);
        self::assertSame(5.0, $requestOptions['timeout']);
        self::assertSame(0, $requestOptions['max_redirects']);
    }

    public function testRejectsInvalidTokensWrongActionsAndUnlistedHostnames(): void
    {
        foreach ([
            ['success' => false, 'action' => 'contact', 'hostname' => 'example.test'],
            ['success' => true, 'action' => 'login', 'hostname' => 'example.test'],
            ['success' => true, 'action' => 'contact', 'hostname' => 'attacker.test'],
        ] as $result) {
            $service = new TurnstileVerificationService(
                new MockHttpClient(static fn (): MockResponse => new MockResponse(json_encode($result, JSON_THROW_ON_ERROR))),
                'secret-key',
                'example.test',
            );

            self::assertFalse($service->verify('turnstile-token'));
        }
    }

    public function testFailsClosedWhenSecretIsMissingOrCloudflareReturnsAnError(): void
    {
        $unusedClient = new MockHttpClient(static function (): never {
            self::fail('Cloudflare should not be called without a secret key.');
        });
        $unconfiguredService = new TurnstileVerificationService($unusedClient, '', '');

        self::assertFalse($unconfiguredService->isConfigured());
        self::assertFalse($unconfiguredService->verify('turnstile-token'));

        $errorService = new TurnstileVerificationService(
            new MockHttpClient(static fn (): MockResponse => new MockResponse('upstream error', ['http_code' => 500])),
            'secret-key',
            '',
        );

        self::assertFalse($errorService->verify('turnstile-token'));
    }
}
