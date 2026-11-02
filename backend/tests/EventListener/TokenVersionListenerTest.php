<?php

declare(strict_types=1);

namespace App\Tests\EventListener;

use App\Entity\User;
use App\EventListener\TokenVersionListener;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTAuthenticatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\InvalidTokenException;
use Lexik\Bundle\JWTAuthenticationBundle\Security\Authenticator\Token\JWTPostAuthenticationToken;
use PHPUnit\Framework\TestCase;

final class TokenVersionListenerTest extends TestCase
{
    public function testCreatedTokensCarryTheCurrentVersion(): void
    {
        $user = (new User())->revokeAllTokens();
        $event = new JWTCreatedEvent(['username' => 'ada@example.test'], $user);

        (new TokenVersionListener())->addVersionClaim($event);

        self::assertSame(2, $event->getData()['tv']);
    }

    public function testCurrentVersionIsAccepted(): void
    {
        $user = (new User())->revokeAllTokens();

        (new TokenVersionListener())->rejectRevokedToken($this->authenticated($user, ['tv' => 2]));

        $this->addToAssertionCount(1);
    }

    public function testOutdatedVersionIsRejected(): void
    {
        $user = (new User())->revokeAllTokens();

        $this->expectException(InvalidTokenException::class);
        (new TokenVersionListener())->rejectRevokedToken($this->authenticated($user, ['tv' => 1]));
    }

    public function testTokensWithoutTheClaimCountAsVersionOne(): void
    {
        $listener = new TokenVersionListener();
        $listener->rejectRevokedToken($this->authenticated(new User(), []));

        $this->expectException(InvalidTokenException::class);
        $listener->rejectRevokedToken($this->authenticated((new User())->revokeAllTokens(), []));
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function authenticated(User $user, array $payload): JWTAuthenticatedEvent
    {
        return new JWTAuthenticatedEvent($payload, new JWTPostAuthenticationToken($user, 'api', [], 'raw.jwt.token'));
    }
}
