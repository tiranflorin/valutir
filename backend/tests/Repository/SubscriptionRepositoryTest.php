<?php

declare(strict_types=1);

namespace App\Tests\Repository;

use App\Entity\User;
use App\Repository\SubscriptionRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class SubscriptionRepositoryTest extends KernelTestCase
{
    public function testVisibleQueryIsScopedToUserAndExcludesSoftDeletedSubscriptions(): void
    {
        self::bootKernel();
        $repository = self::getContainer()->get(SubscriptionRepository::class);
        $user = new User();

        $queryBuilder = $repository->createVisibleForUserQueryBuilder($user);
        $dql = $queryBuilder->getDQL();

        self::assertStringContainsString('s.user = :user', $dql);
        self::assertStringContainsString('s.deletedAt IS NULL', $dql);
        self::assertSame($user, $queryBuilder->getParameter('user')?->getValue());
    }
}
