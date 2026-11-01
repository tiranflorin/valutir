<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final readonly class TurnstileVerificationService
{
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    private const EXPECTED_ACTION = 'contact';

    public function __construct(
        private HttpClientInterface $httpClient,
        #[Autowire('%turnstile_secret%')] private string $secretKey,
        #[Autowire('%turnstile_allowed_hostnames%')] private string $allowedHostnames,
    ) {
    }

    public function isConfigured(): bool
    {
        return '' !== trim($this->secretKey);
    }

    public function verify(string $token, ?string $remoteIp = null): bool
    {
        if (!$this->isConfigured() || '' === trim($token)) {
            return false;
        }

        $body = [
            'secret' => $this->secretKey,
            'response' => $token,
        ];
        if (null !== $remoteIp && '' !== trim($remoteIp)) {
            $body['remoteip'] = $remoteIp;
        }

        try {
            $response = $this->httpClient->request('POST', self::VERIFY_URL, [
                'body' => $body,
                'timeout' => 5,
                'max_redirects' => 0,
            ]);

            if (200 !== $response->getStatusCode()) {
                return false;
            }

            $result = $response->toArray(false);
        } catch (TransportExceptionInterface|DecodingExceptionInterface) {
            return false;
        }

        if (true !== ($result['success'] ?? false) || self::EXPECTED_ACTION !== ($result['action'] ?? null)) {
            return false;
        }

        $allowedHostnames = array_filter(array_map(
            static fn (string $hostname): string => strtolower(rtrim(trim($hostname), '.')),
            explode(',', $this->allowedHostnames),
        ));
        if ([] !== $allowedHostnames) {
            $verifiedHostname = strtolower(rtrim((string) ($result['hostname'] ?? ''), '.'));
            if (!in_array($verifiedHostname, $allowedHostnames, true)) {
                return false;
            }
        }

        return true;
    }
}
