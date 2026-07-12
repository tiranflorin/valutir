export const VITE_API_URL = import.meta.env.VITE_API_URL;

export type LoginPayload = {
    email: string;
    password: string;
};

export type RegisterPayload = {
    name: string;
    email: string;
    password: string;
};

export type AuthUser = {
    email: string;
    name?: string;
    roles?: string[];
};

export async function loginRequest(payload: LoginPayload) {
    const response = await fetch(`${VITE_API_URL}/api/login_check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: payload.email,
            password: payload.password,
        }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Login failed');
    }

    return data as { token: string };
}

export async function registerRequest(payload: RegisterPayload) {
    const response = await fetch(`${VITE_API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Registration failed');
    }

    return data;
}

export async function requestPasswordReset(email: string) {
    const response = await fetch(`${VITE_API_URL}/api/reset-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Password reset request failed');
    }

    return data;
}

export async function submitNewPassword(token: string, newPassword: string) {
    const response = await fetch(`${VITE_API_URL}/api/reset-password/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Password reset failed');
    }

    return data;
}

export function parseJwt(token: string): AuthUser | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            email: payload.username,
            roles: payload.roles || [],
            name: payload.username?.split('@')?.[0] || 'User',
        };
    } catch {
        return null;
    }
}
