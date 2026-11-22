<?php

declare(strict_types=1);

namespace App\Tests\Payment;

use App\Entity\Subscription;
use App\Entity\User;
use App\Payment\FreePlanLimit;
use App\Repository\SubscriptionRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class FreePlanLimitTest extends TestCase
{
    public function testAFreeAccountCanAddUpToTheLimit(): void
    {
        $user = new User();
        $entityManager = $this->createMock(EntityManagerInterface::class);
        // The count runs with the user's row locked, so two parallel requests can't both add the last allowed one.
        $entityManager->expects(self::once())->method('lock')->with($user, LockMode::PESSIMISTIC_WRITE);

        (new FreePlanLimit($entityManager, $this->repositoryCounting(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS - 1)))->assertCanSave($user, null, 'active');
    }

    #[DataProvider('countedStatuses')]
    public function testAFreeAccountAtTheLimitCannotAddAnother(string $status): void
    {
        try {
            $this->limit(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS)->assertCanSave(new User(), null, $status);
            self::fail('Expected the free limit to be enforced.');
        } catch (HttpException $e) {
            self::assertSame(402, $e->getStatusCode());
            self::assertStringContainsString(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS.' active subscriptions', $e->getMessage());
        }
    }

    public function testAFreeAccountAtTheLimitCannotReactivateACancelledSubscription(): void
    {
        $this->expectException(HttpException::class);

        $this->limit(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS)->assertCanSave(new User(), $this->subscription('cancelled'), 'active');
    }

    public function testEditingAnAlreadyActiveSubscriptionIsAllowedAtTheLimit(): void
    {
        $this->limit(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS + 10)->assertCanSave(new User(), $this->subscription('trial'), 'active');
        $this->addToAssertionCount(1);
    }

    public function testInactiveSubscriptionsCanAlwaysBeSaved(): void
    {
        $this->limit(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS + 10)->assertCanSave(new User(), null, 'cancelled');
        $this->limit(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS + 10)->assertCanSave(new User(), $this->subscription('active'), 'other');
        $this->addToAssertionCount(2);
    }

    public function testAnUnlockedAccountHasNoLimit(): void
    {
        $user = (new User())->unlock(new \DateTimeImmutable());

        $this->limit(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS * 10)->assertCanSave($user, null, 'active');
        $this->addToAssertionCount(1);
    }

    public function testAnAdminAccountHasNoLimit(): void
    {
        $this->limit(FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS * 10)->assertCanSave((new User())->setRoles([User::ROLE_ADMIN]), null, 'active');
        $this->addToAssertionCount(1);
    }

    /**
     * The public pages are prerendered, so they can't ask the API for the limit: they state it from
     * LEGAL.freeActiveLimit. CI checks out the whole repository; the local backend container mounts only
     * backend/, so the check is skipped there.
     */
    public function testThePublicPagesStateTheSameLimit(): void
    {
        $legal = \dirname(__DIR__, 3).'/frontend/src/legal.ts';
        if (!is_file($legal)) {
            self::markTestSkipped('frontend/src/legal.ts is not in this checkout.');
        }

        self::assertMatchesRegularExpression(
            '/^\s*freeActiveLimit: '.FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS.',$/m',
            (string) file_get_contents($legal),
            'LEGAL.freeActiveLimit in frontend/src/legal.ts must equal FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS.',
        );
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function countedStatuses(): iterable
    {
        yield 'active' => ['active'];
        yield 'trial' => ['trial'];
    }

    private function limit(int $activeCount): FreePlanLimit
    {
        return new FreePlanLimit($this->createStub(EntityManagerInterface::class), $this->repositoryCounting($activeCount));
    }

    private function repositoryCounting(int $activeCount): SubscriptionRepository
    {
        $repository = $this->createStub(SubscriptionRepository::class);
        $repository->method('countWithStatuses')->willReturn($activeCount);

        return $repository;
    }

    private function subscription(string $status): Subscription
    {
        $subscription = new Subscription();
        $subscription->setStatus($status);

        return $subscription;
    }
}
