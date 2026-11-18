<?php

declare(strict_types=1);

namespace App\Business;

use App\Entity\User;
use App\Service\AccountExportService;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * The paid export of business charges for the owner's accountant: one row per charge that has gone
 * out in the chosen months, oldest first. Amounts stay in their own currency; nothing is converted.
 */
final readonly class AccountantExport
{
    public const array COLUMNS = ['Date', 'Service', 'Category', 'Amount', 'Currency', 'Payment method', 'Invoice filed'];

    /** The longest period one export covers. */
    public const int MAX_MONTHS = 12;

    public function __construct(private BusinessCharges $charges)
    {
    }

    /**
     * The first and last month of the period, checked before any row is written: the export comes
     * with the unlock (403), and covers 1 to MAX_MONTHS months the checklist can show (400).
     *
     * @return array{\DateTimeImmutable, \DateTimeImmutable}
     */
    public function period(User $user, ?string $from, ?string $to): array
    {
        if (!$user->hasPaidFeatures()) {
            throw new AccessDeniedHttpException('The accountant export comes with the one-time unlock.');
        }
        $first = $this->charges->month($user, (string) $from);
        $last = $this->charges->month($user, (string) $to);
        if (null === $first || null === $last) {
            throw new BadRequestHttpException(BusinessCharges::MONTH_ERROR);
        }
        if ($first > $last || $first->modify(sprintf('+%d months', self::MAX_MONTHS)) <= $last) {
            throw new BadRequestHttpException(sprintf('Choose a period of 1 to %d months.', self::MAX_MONTHS));
        }

        return [$first, $last];
    }

    /**
     * Header first.
     *
     * @return iterable<list<string>>
     */
    public function rows(User $user, \DateTimeImmutable $firstMonth, \DateTimeImmutable $lastMonth): iterable
    {
        yield self::COLUMNS;

        foreach ($this->charges->between($user, $firstMonth, $lastMonth) as $charge) {
            if ($charge->upcoming) {
                continue;
            }

            yield array_map(AccountExportService::safeCell(...), [
                $charge->date->format('Y-m-d'),
                (string) $charge->subscription->getServiceName(),
                (string) $charge->subscription->getCategory(),
                $charge->amount,
                $charge->currency,
                (string) $charge->subscription->getPaymentMethod(),
                $charge->invoiceFiled ? 'yes' : 'no',
            ]);
        }
    }

    public static function filename(\DateTimeImmutable $first, \DateTimeImmutable $last): string
    {
        $period = $first->format('Y-m') === $last->format('Y-m') ? $first->format('Y-m') : $first->format('Y-m').'-to-'.$last->format('Y-m');

        return sprintf('valutir-business-charges-%s.csv', $period);
    }
}
