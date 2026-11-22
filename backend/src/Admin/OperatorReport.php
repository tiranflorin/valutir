<?php

declare(strict_types=1);

namespace App\Admin;

use App\Clock\Clock;
use App\Entity\Purchase;
use App\Entity\User;
use App\Payment\FreePlanLimit;
use App\Repository\PurchaseRepository;
use App\Repository\ReminderLogRepository;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Monolog\Attribute\WithMonologChannel;
use Psr\Log\LoggerInterface;

/**
 * What the operator sees on the admin page: account and purchase counts, signs that a background job
 * stopped, and one account's status for a support request. Read-only, and never another user's
 * subscriptions, password data, tokens or Stripe IDs. Every view is logged with user IDs only, on the
 * "admin" channel, which production writes unbuffered (monolog.yaml).
 */
#[WithMonologChannel('admin')]
final class OperatorReport
{
    /** Free accounts at or above this many active subscriptions count as near the limit. */
    public const int NEAR_LIMIT = 30;
    /** A checkout still pending after this long means the webhook didn't settle it. */
    private const string STALE_PENDING_AFTER = '-1 hour';

    public function __construct(
        private readonly UserRepository $users,
        private readonly SubscriptionRepository $subscriptions,
        private readonly PurchaseRepository $purchases,
        private readonly ReminderLogRepository $reminderLogs,
        private readonly FreePlanLimit $freePlanLimit,
        private readonly Clock $clock,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function overview(User $admin): array
    {
        $now = $this->clock->now();
        $accounts = $this->users->countAccounts();
        $stalePending = $this->purchases->findStalePendingSummary($now->modify(self::STALE_PENDING_AFTER));
        $this->logger->info('Admin viewed the overview.', ['admin_user_id' => $admin->getId()]);

        return [
            'generatedAt' => $now->format(\DATE_ATOM),
            'accounts' => $accounts + [
                'unverified' => $accounts['total'] - $accounts['verified'],
                'createdLast7Days' => $this->users->countCreatedSince($now->modify('-7 days')),
                'createdLast30Days' => $this->users->countCreatedSince($now->modify('-30 days')),
            ],
            'nearFreeLimit' => [
                'threshold' => self::NEAR_LIMIT,
                'limit' => FreePlanLimit::MAX_ACTIVE_SUBSCRIPTIONS,
                'accounts' => $this->subscriptions->countFreeAccountsWithAtLeast(self::NEAR_LIMIT, FreePlanLimit::COUNTED_STATUSES),
            ],
            'purchases' => [
                'byStatus' => $this->purchases->countByStatus(),
                'paidByCurrency' => $this->purchases->sumPaidByCurrency(),
            ],
            'health' => [
                'stalePendingPurchases' => $stalePending['count'],
                'oldestStalePendingAt' => $stalePending['oldest']?->format(\DATE_ATOM),
                'remindersSentLast24Hours' => $this->reminderLogs->countSentSince($now->modify('-24 hours')),
                'latestReminderDay' => $this->users->findLatestReminderDay()?->format('Y-m-d'),
            ],
        ];
    }

    /**
     * One account's status, for a support or refund request; null when no account has that email.
     *
     * @return array<string, mixed>|null
     */
    public function account(User $admin, string $email): ?array
    {
        $user = $this->users->findOneByEmail($email);
        if (null === $user) {
            $this->logger->info('Admin looked up an email with no account.', ['admin_user_id' => $admin->getId()]);

            return null;
        }
        $this->logger->info('Admin looked up an account.', ['admin_user_id' => $admin->getId(), 'user_id' => $user->getId()]);

        return [
            'email' => $user->getEmail(),
            'createdAt' => $user->getCreatedAt()->format(\DATE_ATOM),
            'emailVerifiedAt' => $user->getEmailVerifiedAt()?->format(\DATE_ATOM),
            'unlockedAt' => $user->getUnlockedAt()?->format(\DATE_ATOM),
            'admin' => \in_array(User::ROLE_ADMIN, $user->getRoles(), true),
            'paidFeatures' => $user->hasPaidFeatures(),
            'activeSubscriptions' => $this->freePlanLimit->countActive($user),
            'remindersEnabled' => $user->isRemindersEnabled(),
            'timezone' => $user->getTimezone(),
            'remindersProcessedOn' => $user->getRemindersProcessedOn()?->format('Y-m-d'),
            'purchases' => array_map(static fn (Purchase $purchase): array => [
                'status' => $purchase->getStatus(),
                'amountInCents' => $purchase->getAmountInCents(),
                'currency' => strtoupper($purchase->getCurrency()),
                'createdAt' => $purchase->getCreatedAt()->format(\DATE_ATOM),
                'paidAt' => $purchase->getPaidAt()?->format(\DATE_ATOM),
                'revokedAt' => $purchase->getRevokedAt()?->format(\DATE_ATOM),
            ], $this->purchases->findByUserForExport($user)),
        ];
    }
}
