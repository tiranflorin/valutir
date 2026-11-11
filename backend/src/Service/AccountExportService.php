<?php

declare(strict_types=1);

namespace App\Service;

use App\Clock\Clock;
use App\Entity\Purchase;
use App\Entity\ReminderLog;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\PurchaseRepository;
use App\Repository\ReminderLogRepository;
use App\Repository\SubscriptionRepository;

/**
 * The user's own copy of their data (GDPR Art. 15 access and Art. 20 portability).
 *
 * The JSON export holds everything ValuTir keeps about the account. It never contains the password
 * hash, the token version, or verification, reset and email-change token hashes, and no Stripe IDs:
 * those are credentials or internal references, not data about the person.
 */
final readonly class AccountExportService
{
    public const int FORMAT_VERSION = 1;

    /** Spreadsheet columns of the subscriptions CSV, in order. */
    public const array CSV_COLUMNS = [
        'Service', 'Category', 'Amount', 'Currency', 'Cadence', 'Next billing date', 'Status',
        'Business', 'Shared', 'Household size', 'My share', 'Payment method', 'Notes',
        'Manage link', 'Started at', 'Trial ends at', 'Cancelled at',
    ];

    public function __construct(
        private AccountService $accountService,
        private SubscriptionRepository $subscriptionRepository,
        private PurchaseRepository $purchaseRepository,
        private ReminderLogRepository $reminderLogRepository,
        private Clock $clock,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function export(User $user): array
    {
        return [
            'format' => 'valutir-account-export',
            'version' => self::FORMAT_VERSION,
            'exportedAt' => $this->clock->now()->format(\DateTimeInterface::ATOM),
            'account' => $this->accountService->describe($user) + [
                'roles' => $user->getRoles(),
                'emailVerifiedAt' => $user->getEmailVerifiedAt()?->format(\DateTimeInterface::ATOM),
                'unlockedAt' => $user->getUnlockedAt()?->format(\DateTimeInterface::ATOM),
            ],
            'subscriptions' => array_map(
                static fn (Subscription $subscription): array => $subscription->toArray() + [
                    'deletedAt' => $subscription->getDeletedAt()?->format(\DateTimeInterface::ATOM),
                    'deletedUseful' => null !== $subscription->getDeletedAt() ? $subscription->getDeletedUseful() : null,
                ],
                $this->subscriptionRepository->findAllForExport($user),
            ),
            'purchases' => array_map(
                static fn (Purchase $purchase): array => [
                    'product' => $purchase->getProduct(),
                    'amount' => self::centsToDecimal($purchase->getAmountInCents()),
                    'currency' => strtoupper($purchase->getCurrency()),
                    'status' => $purchase->getStatus(),
                    'createdAt' => $purchase->getCreatedAt()->format(\DateTimeInterface::ATOM),
                    'paidAt' => $purchase->getPaidAt()?->format(\DateTimeInterface::ATOM),
                    'revokedAt' => $purchase->getRevokedAt()?->format(\DateTimeInterface::ATOM),
                ],
                $this->purchaseRepository->findByUserForExport($user),
            ),
            'reminders' => array_map(
                static fn (ReminderLog $log): array => [
                    'subscriptionId' => $log->getSubscription()->getId(),
                    'kind' => $log->getKind(),
                    'chargeDate' => $log->getChargeDate()->format('Y-m-d'),
                    'sentAt' => $log->getSentAt()->format(\DateTimeInterface::ATOM),
                ],
                $this->reminderLogRepository->findByUserForExport($user),
            ),
        ];
    }

    /**
     * The subscriptions CSV, header first: the user's current (not deleted) subscriptions, sorted
     * by service name. `$business` limits it to business (true) or personal (false) subscriptions.
     *
     * @return iterable<list<string>>
     */
    public function subscriptionRows(User $user, ?bool $business = null): iterable
    {
        yield self::CSV_COLUMNS;

        $subscriptions = array_filter(
            $this->subscriptionRepository->findByUser($user),
            static fn (Subscription $subscription): bool => null === $business || $subscription->isB2b() === $business,
        );
        usort($subscriptions, static fn (Subscription $a, Subscription $b): int => strcasecmp((string) $a->getServiceName(), (string) $b->getServiceName()) ?: ($a->getId() <=> $b->getId()));

        foreach ($subscriptions as $subscription) {
            $shared = $subscription->isHouseholdShared() && null !== $subscription->getHouseholdSize();
            $amount = (string) $subscription->getAmount();

            yield array_map(self::safeCell(...), [
                (string) $subscription->getServiceName(),
                (string) $subscription->getCategory(),
                $amount,
                (string) $subscription->getCurrency(),
                (string) $subscription->getBillingCadence(),
                (string) $subscription->getNextBillingDate()?->format('Y-m-d'),
                (string) $subscription->getStatus(),
                $subscription->isB2b() ? 'yes' : 'no',
                $shared ? 'yes' : 'no',
                $shared ? (string) $subscription->getHouseholdSize() : '',
                $shared ? number_format((float) $amount / (int) $subscription->getHouseholdSize(), 2, '.', '') : $amount,
                (string) $subscription->getPaymentMethod(),
                (string) $subscription->getNotes(),
                (string) $subscription->getManageUrl(),
                (string) $subscription->getStartedAt()?->format('Y-m-d'),
                (string) $subscription->getTrialEndsAt()?->format('Y-m-d'),
                (string) $subscription->getCancelledAt()?->format('Y-m-d'),
            ]);
        }
    }

    /**
     * A cell a spreadsheet won't run as a formula (CSV injection): text starting with =, +, -, @,
     * a tab or a carriage return gets a leading apostrophe. Plain numbers like "-5.00" stay numbers.
     */
    public static function safeCell(string $value): string
    {
        if ('' === $value || is_numeric($value)) {
            return $value;
        }

        return \in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$value : $value;
    }

    private static function centsToDecimal(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
