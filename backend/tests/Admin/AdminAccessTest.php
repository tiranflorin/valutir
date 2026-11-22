<?php

declare(strict_types=1);

namespace App\Tests\Admin;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Http\AccessMapInterface;

/**
 * The admin endpoints show every account's status, so a signed-in user is not enough: the firewall
 * itself must require ROLE_ADMIN, before any controller runs.
 */
final class AdminAccessTest extends KernelTestCase
{
    public function testEveryAdminPathRequiresTheAdminRole(): void
    {
        foreach (['/api/admin/overview', '/api/admin/accounts', '/api/admin/anything-added-later'] as $path) {
            self::assertSame(['ROLE_ADMIN'], $this->rolesFor($path), $path);
        }
    }

    public function testOtherApiPathsStillOnlyNeedASignedInUser(): void
    {
        self::assertSame(['IS_AUTHENTICATED_FULLY'], $this->rolesFor('/api/subs'));
        self::assertSame(['IS_AUTHENTICATED_FULLY'], $this->rolesFor('/api/administrator'));
    }

    /**
     * @return list<string>|null
     */
    private function rolesFor(string $path): ?array
    {
        $accessMap = static::getContainer()->get('security.access_map');
        self::assertInstanceOf(AccessMapInterface::class, $accessMap);

        return $accessMap->getPatterns(Request::create($path))[0];
    }
}
