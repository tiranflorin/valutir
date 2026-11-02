<?php

declare(strict_types=1);

namespace App\Tests\Reminder;

use App\Entity\User;
use App\Reminder\UnsubscribeToken;
use PHPUnit\Framework\TestCase;

final class UnsubscribeTokenTest extends TestCase
{
    public function testTokenIdentifiesItsUserAndRejectsTampering(): void
    {
        $tokens = new UnsubscribeToken('secret');
        $token = $tokens->create($this->user(42));

        self::assertSame(42, $tokens->userId($token));
        self::assertNull($tokens->userId('43'.substr($token, 2)), 'Another user ID with the same signature');
        self::assertNull($tokens->userId($token.'0'));
        self::assertNull($tokens->userId('not-a-token'));
        self::assertNull((new UnsubscribeToken('other-secret'))->userId($token), 'Signed with a different secret');
    }

    private function user(int $id): User
    {
        $user = new User();
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, $id);

        return $user;
    }
}
