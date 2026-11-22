import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppHeader from '../components/AppHeader';
import AdminPage from '../pages/AdminPage';
import { STORAGE_KEY, callsTo, mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const signInAsAdmin = () => window.localStorage.setItem(
    STORAGE_KEY,
    `header.${btoa(JSON.stringify({ username: 'operator@example.test', roles: ['ROLE_ADMIN', 'ROLE_USER'], tv: 1 }))}.signature`,
);

const overview = {
    generatedAt: '2026-11-22T12:00:00+00:00',
    accounts: { total: 12, verified: 9, unverified: 3, paid: 3, free: 8, admins: 1, createdLast7Days: 2, createdLast30Days: 5 },
    nearFreeLimit: { threshold: 30, limit: 40, accounts: 4 },
    purchases: { byStatus: { paid: 3, refunded: 1 }, paidByCurrency: { EUR: 5997 } },
    health: { stalePendingPurchases: 0, oldestStalePendingAt: null, remindersSentLast24Hours: 17, latestReminderDay: '2026-11-22' },
};

const account = {
    email: 'ada@example.test',
    createdAt: '2026-11-03T09:00:00+00:00',
    emailVerifiedAt: '2026-11-01T08:00:00+00:00',
    unlockedAt: null,
    admin: false,
    paidFeatures: false,
    activeSubscriptions: 7,
    remindersEnabled: true,
    timezone: 'Europe/Berlin',
    remindersProcessedOn: '2026-11-22',
    purchases: [{
        status: 'refunded', amountInCents: 1999, currency: 'EUR',
        createdAt: '2026-11-02T10:00:00+00:00', paidAt: '2026-11-02T10:01:00+00:00', revokedAt: '2026-11-05T09:00:00+00:00',
    }],
};

describe('admin page', () => {
    it('shows the counts and background work, and looks an account up by email', async () => {
        signInAsAdmin();
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile({ email: 'operator@example.test' }) }),
            'GET /api/admin/overview': () => ({ status: 200, body: overview }),
            'GET /api/admin/accounts': ({ url }) => (url.includes('ada%40example.test')
                ? { status: 200, body: account }
                : { status: 404, body: { message: 'No account uses that email.' } }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(<AdminPage />, { route: '/admin' });

        const accounts = await screen.findByRole('region', { name: 'Accounts' });
        expect(within(accounts).getByText('All accounts').nextSibling).toHaveTextContent('12');
        expect(within(accounts).getByText('Free, near the limit (30+ of 40 active)').nextSibling).toHaveTextContent('4');
        expect(within(screen.getByRole('region', { name: 'Purchases' })).getByText('Paid and kept').nextSibling).toHaveTextContent('€59.97');
        const health = screen.getByRole('region', { name: 'Background work' });
        expect(within(health).getByText('Checkouts pending for over an hour').nextSibling).toHaveTextContent('0');
        expect(within(health).getByText('Reminder emails sent in the last 24 hours').nextSibling).toHaveTextContent('17');

        await user.type(screen.getByLabelText(/email/i), 'ada@example.test');
        await user.click(screen.getByRole('button', { name: 'Look up' }));

        const lookup = screen.getByRole('region', { name: 'Look up an account' });
        expect(await within(lookup).findByText('Free')).toBeInTheDocument();
        expect(within(lookup).getByText('Active subscriptions').nextSibling).toHaveTextContent('7 of 40');
        expect(within(lookup).getByText('Created').nextSibling).toHaveTextContent('3 Nov 2026');
        expect(within(lookup).getByRole('cell', { name: 'refunded' })).toBeInTheDocument();

        await user.clear(screen.getByLabelText(/email/i));
        await user.type(screen.getByLabelText(/email/i), 'nobody@example.test');
        await user.click(screen.getByRole('button', { name: 'Look up' }));
        expect(await within(lookup).findByText('No account uses that email.')).toBeInTheDocument();
        expect(callsTo(calls, 'GET /api/admin/accounts')).toHaveLength(2);
    });

    it('shows a regular account the ordinary Page not found, asks nothing of the admin API, and offers no admin link', async () => {
        signIn();
        const calls = mockApi({ 'GET /api/profile': () => ({ status: 200, body: profile() }) });
        renderWithMemoryRoute(<AdminPage />, { route: '/admin' });

        expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
        expect(screen.queryByText(/admin|operator/i)).not.toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole('button', { name: 'Open account menu' }));
        expect(screen.queryByRole('menuitem', { name: 'Admin' })).not.toBeInTheDocument();
        expect(calls.some((call) => call.key.startsWith('GET /api/admin'))).toBe(false);
    });

    it('shows a signed-out visitor Page not found instead of the sign-in page', () => {
        const calls = mockApi({});
        renderWithMemoryRoute(<AdminPage />, { route: '/admin' });

        expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go to the homepage' })).toHaveAttribute('href', '/');
        expect(screen.queryByText(/admin|operator/i)).not.toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it('offers the admin link in the account menu to admins', async () => {
        signInAsAdmin();
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile({ email: 'operator@example.test' }) }),
        });
        renderWithMemoryRoute(<AppHeader />, { route: '/my-subs' });

        await userEvent.setup().click(screen.getByRole('button', { name: 'Open account menu' }));
        expect(await screen.findByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    });
});
