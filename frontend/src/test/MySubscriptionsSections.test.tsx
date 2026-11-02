import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import { renderWithMemoryRoute } from './test-utils';

const STORAGE_KEY = 'valutir_auth_token';
const fakeJwt = `header.${btoa(JSON.stringify({ username: 'ada@example.test', roles: ['ROLE_USER'] }))}.signature`;

const subscription = (id: number, serviceName: string, status: string, extra: Record<string, unknown> = {}) => ({
    id,
    serviceName,
    amount: '9.99',
    currency: 'EUR',
    billingCadence: 'monthly',
    category: 'Streaming',
    status,
    startedAt: '2026-01-01',
    nextBillingDate: '2027-01-15',
    cancelledAt: null,
    trialEndsAt: null,
    trialReminderSentAt: null,
    b2b: false,
    autoRenew: true,
    ...extra,
});

const subscriptions = [
    subscription(1, 'Netflix', 'active'),
    subscription(2, 'Spotify', 'active'),
    subscription(3, 'Old Hosting', 'cancelled', { cancelledAt: '2026-10-01', autoRenew: false }),
];

/** The rows of the table that follows the section label with the given text. */
const rowsUnder = (label: RegExp) => {
    const heading = screen.getByText(label);
    const table = heading.closest('.list-labels')!.nextElementSibling as HTMLElement;
    return within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
};

describe('MySubscriptionsPage sections', () => {
    beforeEach(() => {
        window.localStorage.setItem(STORAGE_KEY, fakeJwt);
        window.localStorage.setItem('valutir_dashboard_view', 'personal');
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const body = String(url).endsWith('/api/subs')
                ? subscriptions
                : { email: 'ada@example.test', name: 'Ada', defaultCurrency: 'EUR', pendingEmail: null };
            return new Response(JSON.stringify(body), { status: 200 });
        }));
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('lists cancelled subscriptions in their own section after My subscriptions', async () => {
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        const mySection = await screen.findByText('My subscriptions · 2');
        const cancelledSection = screen.getByText('Cancelled · 1');

        expect(rowsUnder(/^My subscriptions/)).toEqual(['Netflix', 'Spotify']);
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
        expect(mySection.compareDocumentPosition(cancelledSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByText(/other subscriptions/i)).not.toBeInTheDocument();
    });

    it('shows only the cancelled section when the Cancelled filter is selected', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await user.click(await screen.findByRole('button', { name: 'Cancelled 1' }));

        expect(screen.queryByText(/^My subscriptions/)).not.toBeInTheDocument();
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
    });

    it('splits the business view the same way', async () => {
        window.localStorage.setItem('valutir_dashboard_view', 'business');
        const businessSubscriptions = subscriptions.map((item) => ({ ...item, b2b: true }));
        vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
            String(url).endsWith('/api/subs')
                ? businessSubscriptions
                : { email: 'ada@example.test', name: 'Ada', defaultCurrency: 'EUR', pendingEmail: null },
        ), { status: 200 })));
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(await screen.findByRole('heading', { name: 'Business subscriptions' })).toBeInTheDocument();
        await screen.findByText('My subscriptions · 2');
        expect(rowsUnder(/^My subscriptions/)).toEqual(['Netflix', 'Spotify']);
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
    });
});
