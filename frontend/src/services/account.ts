import { VITE_API_URL } from './auth';

export type DefaultCurrency = 'EUR' | 'USD' | 'RON';

export const currencyOptions: { code: DefaultCurrency; label: string }[] = [
    { code: 'EUR', label: 'EUR · Euro (€)' },
    { code: 'USD', label: 'USD · US Dollar ($)' },
    { code: 'RON', label: 'RON · Romanian Leu (lei)' },
];

export type AccountProfile = {
    email: string;
    name: string | null;
    defaultCurrency: DefaultCurrency;
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

const errorMessage = (data: unknown, fallback: string): string => {
    if (!data || typeof data !== 'object') {
        return fallback;
    }
    const { errors, message } = data as { errors?: unknown; message?: unknown };
    if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat().find((item): item is string => typeof item === 'string');
        if (first) {
            return first;
        }
    }

    return typeof message === 'string' && message ? message : fallback;
};

async function apiRequest<T>(path: string, { method = 'GET', token, body, fallbackError }: RequestOptions): Promise<T> {
    const response = await fetch(`${VITE_API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(response.status, errorMessage(data, fallbackError));
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

export const updateProfile = (token: string, changes: Partial<Pick<AccountProfile, 'name' | 'defaultCurrency'>>) =>
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

export const logoutEverywhereRequest = (token: string) =>
    apiRequest<null>('/api/logout/all', { method: 'POST', token, fallbackError: 'Unable to sign out of all devices.' });
