import { apiRequest } from './account';

/** The admin page's figures (`GET /api/admin/overview`); admin accounts only. */
export type AdminOverview = {
    generatedAt: string;
    accounts: {
        total: number;
        verified: number;
        unverified: number;
        /** Accounts that bought the unlock. */
        paid: number;
        /** Neither unlocked nor admin. */
        free: number;
        admins: number;
        /** Only accounts created since sign-up dates were recorded (22 November 2026). */
        createdLast7Days: number;
        createdLast30Days: number;
    };
    nearFreeLimit: { threshold: number; limit: number; accounts: number };
    purchases: {
        byStatus: Record<string, number>;
        /** Paid purchases not refunded or disputed, in cents, VAT included, before Stripe's fees. */
        paidByCurrency: Record<string, number>;
    };
    health: {
        stalePendingPurchases: number;
        oldestStalePendingAt: string | null;
        remindersSentLast24Hours: number;
        /** YYYY-MM-DD, a local day; null when the reminder run never handled an account. */
        latestReminderDay: string | null;
    };
};

export type AdminPurchase = {
    status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'disputed';
    amountInCents: number;
    currency: string;
    createdAt: string;
    paidAt: string | null;
    revokedAt: string | null;
};

/** One account's status for a support request (`GET /api/admin/accounts?email=`). */
export type AdminAccount = {
    email: string;
    createdAt: string;
    emailVerifiedAt: string | null;
    unlockedAt: string | null;
    admin: boolean;
    paidFeatures: boolean;
    activeSubscriptions: number;
    remindersEnabled: boolean;
    timezone: string;
    /** YYYY-MM-DD: the last local day the reminder run handled this account. */
    remindersProcessedOn: string | null;
    purchases: AdminPurchase[];
};

export const fetchAdminOverview = (token: string | null) =>
    apiRequest<AdminOverview>('/api/admin/overview', { token, fallbackError: 'Unable to load the admin overview.' });

export const lookUpAccount = (token: string | null, email: string) =>
    apiRequest<AdminAccount>(`/api/admin/accounts?email=${encodeURIComponent(email.trim())}`, {
        token,
        fallbackError: 'Unable to look up that account.',
    });
