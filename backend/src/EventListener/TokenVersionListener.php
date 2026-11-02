<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTAuthenticatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\InvalidTokenException;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;

/**
 * Embeds the user's token version in every JWT and rejects tokens whose version is
 * out of date. Bumping the version ("sign out everywhere", password change or reset,
 * email change) revokes every token issued before. Single-device logout uses Lexik's blocklist.
 */
final class TokenVersionListener
{
    public const string CLAIM = 'tv';

    #[AsEventListener(event: Events::JWT_CREATED)]
    public function addVersionClaim(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();
        if (!$user instanceof User) {
            return;
        }

        $payload = $event->getData();
        $payload[self::CLAIM] = $user->getTokenVersion();
        $event->setData($payload);
    }

    #[AsEventListener(event: Events::JWT_AUTHENTICATED)]
    public function rejectRevokedToken(JWTAuthenticatedEvent $event): void
    {
        $user = $event->getToken()->getUser();
        if (!$user instanceof User) {
            return;
        }

        // Tokens issued before this claim existed count as version 1, so deploying it signs nobody out.
        $version = $event->getPayload()[self::CLAIM] ?? 1;
        if ($version !== $user->getTokenVersion()) {
            throw new InvalidTokenException('Invalid JWT Token');
        }
    }
}
