<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Billing\BillingDateAdvancer;
use App\Billing\BillingSchedule;
use App\Billing\CalendarDay;
use App\Clock\Clock;
use App\Command\AdvanceBillingDatesCommand;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

final class AdvanceBillingDatesCommandTest extends TestCase
{
    public function testUpdatesStoredDatesUsingEachUsersLocalToday(): void
    {
        // 22:30 UTC on 20 Nov is already 21 Nov in Bucharest. A charge on the 20th is therefore
        // due today for the UTC user (stays 20 Nov) but already past in Bucharest (moves to 20 Dec).
        $bucharest = (new User())->setEmail('ro@example.test')->setTimezone('Europe/Bucharest');
        $utc = (new User())->setEmail('utc@example.test')->setTimezone('UTC');
        $roNetflix = $this->subscription('2026-10-20');
        $utcNetflix = $this->subscription('2026-10-20');

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::exactly(2))->method('flush');
        $tester = $this->tester([$bucharest, $utc], [[$roNetflix], [$utcNetflix]], $entityManager, '2026-11-20 22:30:00');

        self::assertSame(Command::SUCCESS, $tester->execute([]));
        self::assertSame('2026-12-20', $roNetflix->getNextBillingDate()?->format('Y-m-d'));
        self::assertSame('2026-11-20', $utcNetflix->getNextBillingDate()?->format('Y-m-d'));
        self::assertStringContainsString('Updated 2 subscription(s) for 2 user(s).', $tester->getDisplay());
    }

    public function testDryRunSavesNothing(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('flush');
        $tester = $this->tester([(new User())->setEmail('a@example.test')], [[$this->subscription('2026-07-21')]], $entityManager, '2026-11-02 10:00:00');

        self::assertSame(Command::SUCCESS, $tester->execute(['--dry-run' => true]));
        self::assertStringContainsString('Would update 1 subscription(s) for 1 user(s).', $tester->getDisplay());
    }

    /**
     * @param list<User>               $users
     * @param list<list<Subscription>> $subscriptionsPerUser
     */
    private function tester(array $users, array $subscriptionsPerUser, EntityManagerInterface $entityManager, string $utcNow): CommandTester
    {
        $userRepository = $this->createStub(UserRepository::class);
        $userRepository->method('findAll')->willReturn($users);
        $subscriptionRepository = $this->createStub(SubscriptionRepository::class);
        $subscriptionRepository->method('findBillableForUser')->willReturnOnConsecutiveCalls(...$subscriptionsPerUser);
        $clock = $this->createStub(Clock::class);
        $clock->method('now')->willReturn(new \DateTimeImmutable($utcNow, new \DateTimeZone('UTC')));

        return new CommandTester(new AdvanceBillingDatesCommand(
            $userRepository,
            $subscriptionRepository,
            new BillingDateAdvancer(new BillingSchedule()),
            $entityManager,
            $clock,
        ));
    }

    private function subscription(string $nextBillingDate): Subscription
    {
        $subscription = (new Subscription())->setServiceName('Netflix')->setBillingCadence('monthly')->setNextBillingDate(CalendarDay::fromString($nextBillingDate));
        $subscription->setStatus('active');

        return $subscription;
    }
}
