<?php

declare(strict_types=1);

namespace App\Tests\Dto;

use App\Dto\SubscriptionUpsertRequest;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class SubscriptionCadenceTest extends KernelTestCase
{
    public function testAcceptsTheCadencesTheAppOffers(): void
    {
        foreach (['weekly', 'monthly', 'quarterly', 'yearly'] as $cadence) {
            self::assertSame([], $this->violationPaths($cadence), $cadence);
        }
    }

    public function testRejectsDailyAndUnknownCadences(): void
    {
        foreach (['daily', 'hourly', 'Monthly'] as $cadence) {
            self::assertSame(['billingCadence'], $this->violationPaths($cadence), $cadence);
        }
    }

    /**
     * @return list<string>
     */
    private function violationPaths(string $cadence): array
    {
        $request = new SubscriptionUpsertRequest();
        $request->serviceName = 'Netflix';
        $request->amount = 13.99;
        $request->currency = 'EUR';
        $request->billingCadence = $cadence;
        $request->status = 'active';

        self::bootKernel();
        $paths = [];
        foreach (self::getContainer()->get(ValidatorInterface::class)->validate($request) as $violation) {
            $paths[] = $violation->getPropertyPath();
        }

        return $paths;
    }
}
