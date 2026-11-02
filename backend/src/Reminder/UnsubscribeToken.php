<?php

declare(strict_types=1);

namespace App\Reminder;

use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Signed, login-free token for the "turn off reminders" link: "{userId}.{hmac}".
 */
final readonly class UnsubscribeToken
{
    public function __construct(#[Autowire('%kernel.secret%')] private string $secret)
    {
    }

    public function create(User $user): string
    {
        $id = (string) $user->getId();

        return $id.'.'.$this->sign($id);
    }

    /** The user ID the token was issued for, or null when it isn't a valid token. */
    public function userId(string $token): ?int
    {
        if (1 !== preg_match('/\A(\d{1,10})\.([a-f0-9]{64})\z/', $token, $match)) {
            return null;
        }

        return hash_equals($this->sign($match[1]), $match[2]) ? (int) $match[1] : null;
    }

    private function sign(string $userId): string
    {
        return hash_hmac('sha256', 'reminders-unsubscribe:'.$userId, $this->secret);
    }
}
