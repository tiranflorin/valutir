import { vi } from 'vitest';

/** Shared fakes for tests that talk to the API through `fetch`. */

export const STORAGE_KEY = 'valutir_auth_token';

export const fakeJwt = (email = 'ada@example.test', version = 1) =>
    `header.${btoa(JSON.stringify({ username: email, roles: ['ROLE_USER'], tv: version }))}.signature`;

/** Starts the test signed in, the way a returning visitor's browser would be. */
export const signIn = (email?: string) => window.localStorage.setItem(STORAGE_KEY, fakeJwt(email));

export const profile = (overrides: Record<string, unknown> = {}) => ({
    email: 'ada@example.test',
    emailVerified: true,
    name: 'Ada',
    defaultCurrency: 'EUR',
    timezone: 'Europe/Berlin',
    remindersEnabled: true,
    pendingEmail: null,
    ...overrides,
});

export type ApiCall = { key: string; url: string; init: RequestInit };
export type Reply = { status: number; body?: unknown };
export type Handlers = Record<string, (call: ApiCall) => Reply>;

/**
 * Replaces `fetch` with handlers keyed by "METHOD /path" (query string ignored) and records every call.
 * Unexpected requests get a 500, so a test fails loudly instead of silently hitting nothing.
 */
export const mockApi = (handlers: Handlers) => {
    const calls: ApiCall[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit = {}) => {
        const url = String(input);
        const call = { key: `${init.method ?? 'GET'} ${new URL(url, 'http://api.test').pathname}`, url, init };
        calls.push(call);
        const handler = handlers[call.key];
        const { status, body } = handler ? handler(call) : { status: 500, body: { message: `Unexpected ${call.key}` } };

        return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status });
    }));

    return calls;
};

export const bodyOf = (call: ApiCall) => JSON.parse(String(call.init.body));
export const authHeader = (call: ApiCall) => (call.init.headers as Record<string, string> | undefined)?.Authorization;
export const callsTo = (calls: ApiCall[], key: string) => calls.filter((call) => call.key === key);
