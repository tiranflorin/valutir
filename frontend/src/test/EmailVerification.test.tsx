import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import PlansPage from '../pages/PlansPage';
import { renderWithMemoryRoute } from './test-utils';

const STORAGE_KEY = 'valutir_auth_token';
const fakeJwt = `header.${btoa(JSON.stringify({ username: 'ada@example.test', roles: ['ROLE_USER'], tv: 1 }))}.signature`;
const TOKEN = 'a'.repeat(64);
const profile = (emailVerified: boolean) => ({
    email: 'ada@example.test',
    emailVerified,
    name: 'Ada',
    defaultCurrency: 'EUR',
    timezone: 'Europe/Berlin',
    remindersEnabled: true,
    pendingEmail: null,
});
const billing = {
    unlocked: false,
    unlockedAt: null,
    checkoutAvailable: true,
    price: { amountInCents: 1999, currency: 'EUR', taxInclusive: true },
    freeActiveLimit: 50,
    activeCount: 3,
};

type Reply = { status: number; body?: unknown };

const mockApi = (handlers: Record<string, (init: RequestInit) => Reply>) => {
    const calls: { key: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
        const key = `${init.method ?? 'GET'} ${new URL(url, 'http://api.test').pathname}`;
        calls.push({ key, init });
        const handler = handlers[key];
        const { status, body } = handler ? handler(init) : { status: 500, body: { message: `Unexpected ${key}` } };
        return new Response(JSON.stringify(body ?? {}), { status });
    }));

    return calls;
};

describe('email verification', () => {
    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
    });

    describe('signed in', () => {
        beforeEach(() => {
            window.localStorage.setItem(STORAGE_KEY, fakeJwt);
        });

        it('asks an unverified user to confirm and resends the link', async () => {
            const calls = mockApi({
                'GET /api/profile': () => ({ status: 200, body: profile(false) }),
                'POST /api/profile/email/verification': () => ({ status: 202, body: { message: 'We sent a new confirmation link to ada@example.test. It works for 24 hours.' } }),
            });
            renderWithMemoryRoute(<AppHeader />, { route: '/my-subs' });

            expect(await screen.findByText(/Confirm your email address/)).toBeInTheDocument();
            await userEvent.click(screen.getByRole('button', { name: 'Resend link' }));

            expect(await screen.findByText('We sent a new confirmation link to ada@example.test. It works for 24 hours.')).toBeInTheDocument();
            expect(calls.map((call) => call.key)).toContain('POST /api/profile/email/verification');
        });

        it('shows nothing once the address is verified', async () => {
            const calls = mockApi({ 'GET /api/profile': () => ({ status: 200, body: profile(true) }) });
            renderWithMemoryRoute(<AppHeader />, { route: '/my-subs' });

            await waitFor(() => expect(calls.map((call) => call.key)).toContain('GET /api/profile'));
            expect(screen.queryByText(/Confirm your email address/)).not.toBeInTheDocument();
        });

        it('keeps the upgrade off until the address is verified', async () => {
            mockApi({
                'GET /api/profile': () => ({ status: 200, body: profile(false) }),
                'GET /api/billing': () => ({ status: 200, body: billing }),
            });
            renderWithMemoryRoute(<PlansPage />, { route: '/plans' });

            expect(await screen.findByText(/Confirm your email address first/)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Pay €19.99 once' })).toBeDisabled();
        });

        it('refreshes the account after the link is opened in a signed-in browser', async () => {
            let verified = false;
            mockApi({
                'GET /api/profile': () => ({ status: 200, body: profile(verified) }),
                'POST /api/register/verify-email': () => {
                    verified = true;
                    return { status: 200, body: { message: 'Your email address is confirmed.' } };
                },
            });
            renderWithMemoryRoute(
                <>
                    <AppHeader />
                    <Routes><Route path="/verify-email" element={<VerifyEmailPage />} /></Routes>
                </>,
                { route: `/verify-email?token=${TOKEN}` },
            );

            expect(await screen.findByText('Your email address is confirmed.')).toBeInTheDocument();
            await waitFor(() => expect(screen.queryByText(/Confirm your email address/)).not.toBeInTheDocument());
        });
    });

    it('confirms the address from the emailed link without being signed in', async () => {
        const calls = mockApi({
            'POST /api/register/verify-email': () => ({ status: 200, body: { message: 'Your email address is confirmed.' } }),
        });
        renderWithMemoryRoute(<VerifyEmailPage />, { route: `/verify-email?token=${TOKEN}` });

        expect(await screen.findByText('Email confirmed')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        const verifyCalls = calls.filter((call) => call.key === 'POST /api/register/verify-email');
        expect(verifyCalls).toHaveLength(1);
        expect(JSON.parse(String(verifyCalls[0].init.body))).toEqual({ token: TOKEN });
    });

    it('explains an invalid or expired link', async () => {
        mockApi({
            'POST /api/register/verify-email': () => ({ status: 400, body: { message: 'This verification link is invalid or expired. If you already confirmed your address, you are all set.' } }),
        });
        renderWithMemoryRoute(<VerifyEmailPage />, { route: `/verify-email?token=${TOKEN}` });

        expect(await screen.findByText('Link not valid')).toBeInTheDocument();
        expect(screen.getByText(/If you already confirmed your address/)).toBeInTheDocument();
    });

    it('rejects a link without a token without calling the API', () => {
        const calls = mockApi({});
        renderWithMemoryRoute(<VerifyEmailPage />, { route: '/verify-email' });

        expect(screen.getByText('This verification link is missing its token.')).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });
});
