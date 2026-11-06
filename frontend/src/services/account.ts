import { API_URL } from '../config';

export type DefaultCurrency = 'EUR' | 'USD' | 'RON';

export const currencyOptions: { code: DefaultCurrency; label: string }[] = [
    { code: 'EUR', label: 'EUR · Euro (€)' },
    { code: 'USD', label: 'USD · US Dollar ($)' },
    { code: 'RON', label: 'RON · Romanian Leu (lei)' },
];

export type AccountProfile = {
    email: string;
    /** False until the owner opens the verification link; unverified accounts can't pay or get reminders. */
    emailVerified: boolean;
    name: string | null;
    defaultCurrency: DefaultCurrency;
    /** IANA time zone used for reminder timing, e.g. "Europe/Bucharest". */
    timezone: string;
    remindersEnabled: boolean;
    pendingEmail: string | null;
};

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    token?: string | null;
    body?: unknown;
    fallbackError: string;
};

/** The message to show for a failed API call: the first field error, else the general message. */
export const apiErrorMessage = (data: unknown, fallback: string): string => {
    if (!data || typeof data !== 'object') {
        return fallback;
    }
    const { errors, message, error } = data as { errors?: unknown; message?: unknown; error?: unknown };
    if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat().find((item): item is string => typeof item === 'string');
        if (first) {
            return first;
        }
    }
    if (typeof message === 'string' && message) {
        return message;
    }

    return typeof error === 'string' && error ? error : fallback;
};

async function apiRequest<T>(path: string, { method = 'GET', token, body, fallbackError }: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(response.status, apiErrorMessage(data, fallbackError));
    }

    return data as T;
}

const isProfile = (value: unknown): value is AccountProfile =>
    !!value && typeof value === 'object' && typeof (value as AccountProfile).email === 'string';

export async function fetchProfile(token: string): Promise<AccountProfile> {
    const data = await apiRequest<unknown>('/api/profile', { token, fallbackError: 'Unable to load your profile.' });
    if (!isProfile(data)) {
        throw new ApiError(500, 'Unable to load your profile.');
    }

    return data;
}

export const updateProfile = (token: string, changes: Partial<Pick<AccountProfile, 'name' | 'defaultCurrency' | 'timezone' | 'remindersEnabled'>>) =>
    apiRequest<AccountProfile>('/api/profile', {
        method: 'PATCH',
        token,
        body: changes,
        fallbackError: 'Unable to save your changes.',
    });

export const changePassword = (token: string, currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string; token: string }>('/api/profile/password', {
        method: 'PATCH',
        token,
        body: { currentPassword, newPassword },
        fallbackError: 'Unable to update your password.',
    });

export const requestEmailChange = (token: string, newEmail: string, currentPassword: string) =>
    apiRequest<{ message: string }>('/api/profile/email', {
        method: 'POST',
        token,
        body: { newEmail, currentPassword },
        fallbackError: 'Unable to start the email change.',
    });

/** Public: the emailed verification token is the credential. */
export const verifyEmail = (verificationToken: string) =>
    apiRequest<{ message: string }>('/api/register/verify-email', {
        method: 'POST',
        body: { token: verificationToken },
        fallbackError: 'This verification link is invalid or expired.',
    });

export const resendEmailVerification = (token: string) =>
    apiRequest<{ message: string }>('/api/profile/email/verification', {
        method: 'POST',
        token,
        fallbackError: 'Unable to send a new confirmation link.',
    });

/** Public: the emailed confirmation token is the credential. */
export const confirmEmailChange = (confirmationToken: string) =>
    apiRequest<{ message: string }>('/api/profile/email/confirm', {
        method: 'POST',
        body: { token: confirmationToken },
        fallbackError: 'The confirmation link is invalid or expired.',
    });

export const deleteAccount = (token: string, currentPassword: string) =>
    apiRequest<null>('/api/profile', {
        method: 'DELETE',
        token,
        body: { currentPassword },
        fallbackError: 'Unable to delete your account.',
    });

export const logoutRequest = (token: string) =>
    apiRequest<null>('/api/logout', { method: 'POST', token, fallbackError: 'Unable to sign out.' });

export type AccountExportKind = 'json' | 'csv';

const EXPORT_PATHS: Record<AccountExportKind, string> = {
    json: '/api/profile/export',
    csv: '/api/profile/export/subscriptions.csv',
};

/** The file name from a `Content-Disposition: attachment; filename="..."` header, if it is a plain one. */
export const attachmentFilename = (header: string | null): string | null => {
    const match = header?.match(/filename="?([A-Za-z0-9._-]+)"?\s*(?:;|$)/);

    return match ? match[1] : null;
};

/**
 * "Download my data": the account as JSON, or the subscriptions as CSV (optionally one view only).
 * Resolves with the file and the name the server suggests.
 */
export async function fetchAccountExport(
    token: string,
    kind: AccountExportKind,
    view?: 'personal' | 'business',
): Promise<{ blob: Blob; filename: string }> {
    const query = kind === 'csv' && view ? `?view=${view}` : '';
    const response = await fetch(`${API_URL}${EXPORT_PATHS[kind]}${query}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new ApiError(response.status, apiErrorMessage(data, 'Unable to prepare your download.'));
    }

    return {
        blob: await response.blob(),
        filename: attachmentFilename(response.headers.get('Content-Disposition'))
            ?? (kind === 'json' ? 'valutir-export.json' : 'valutir-subscriptions.csv'),
    };
}

export const logoutEverywhereRequest = (token: string) =>
    apiRequest<null>('/api/logout/all', { method: 'POST', token, fallbackError: 'Unable to sign out of all devices.' });

/** Public: the signed token from a reminder email is the credential. */
export const unsubscribeFromReminders = (unsubscribeToken: string) =>
    apiRequest<{ message: string }>(`/api/reminders/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`, {
        method: 'POST',
        fallbackError: 'This unsubscribe link is invalid.',
    });

/** The account's plan: free (limited active subscriptions) or unlocked by the one-time payment. */
export type BillingStatus = {
    unlocked: boolean;
    unlockedAt: string | null;
    /** False when the server has no Stripe keys: the upgrade button is disabled. */
    checkoutAvailable: boolean;
    /** amountInCents: 1999 = €19.99, tax included. */
    price: { amountInCents: number; currency: string; taxInclusive: boolean };
    freeActiveLimit: number;
    activeCount: number;
};

export const fetchBillingStatus = (token: string) =>
    apiRequest<BillingStatus>('/api/billing', { token, fallbackError: 'Unable to load your plan.' });

/** The only place the browser may be sent to pay. */
const STRIPE_CHECKOUT_ORIGIN = 'https://checkout.stripe.com';

/** Asks the API for a Stripe Checkout URL; amount and product are decided by the server. */
export async function startCheckout(token: string): Promise<string> {
    const { url } = await apiRequest<{ url?: unknown }>('/api/billing/checkout', {
        method: 'POST',
        token,
        fallbackError: 'Unable to start the payment. Please try again later.',
    });
    if (typeof url !== 'string' || !isStripeCheckoutUrl(url)) {
        throw new ApiError(502, 'Unable to start the payment. Please try again later.');
    }

    return url;
}

export const isStripeCheckoutUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return parsed.origin === STRIPE_CHECKOUT_ORIGIN;
    } catch {
        return false;
    }
};

export const formatPrice = ({ amountInCents, currency }: BillingStatus['price']): string =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amountInCents / 100);
