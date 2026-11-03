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
        // The count runs with the user's row locked, so two parallel requests can't both add the 50th.
        $entityManager->expects(self::once())->method('lock')->with($user, LockMode::PESSIMISTIC_WRITE);

        (new FreePlanLimit($entityManager, $this->repositoryCounting(49)))->assertCanSave($user, null, 'active');
    }

    #[DataProvider('countedStatuses')]
    public function testAFreeAccountAtTheLimitCannotAddAnother(string $status): void
    {
        try {
            $this->limit(50)->assertCanSave(new User(), null, $status);
            self::fail('Expected the free limit to be enforced.');
        } catch (HttpException $e) {
            self::assertSame(402, $e->getStatusCode());
            self::assertStringContainsString('50 active subscriptions', $e->getMessage());
        }
    }

    public function testAFreeAccountAtTheLimitCannotReactivateACancelledSubscription(): void
    {
        $this->expectException(HttpException::class);

        $this->limit(50)->assertCanSave(new User(), $this->subscription('cancelled'), 'active');
    }

    public function testEditingAnAlreadyActiveSubscriptionIsAllowedAtTheLimit(): void
    {
        $this->limit(60)->assertCanSave(new User(), $this->subscription('trial'), 'active');
        $this->addToAssertionCount(1);
    }

    public function testInactiveSubscriptionsCanAlwaysBeSaved(): void
    {
        $this->limit(60)->assertCanSave(new User(), null, 'cancelled');
        $this->limit(60)->assertCanSave(new User(), $this->subscription('active'), 'other');
        $this->addToAssertionCount(2);
    }

    public function testAnUnlockedAccountHasNoLimit(): void
    {
        $user = (new User())->unlock(new \DateTimeImmutable());

        $this->limit(500)->assertCanSave($user, null, 'active');
        $this->addToAssertionCount(1);
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
