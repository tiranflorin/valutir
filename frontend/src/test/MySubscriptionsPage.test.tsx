import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import { mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

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

const dashboardApi = (items: unknown[]) => mockApi({
    'GET /api/profile': () => ({ status: 200, body: profile() }),
    'GET /api/subs': () => ({ status: 200, body: items }),
});

/** The rows of the table that follows the section label with the given text. */
const rowsUnder = (label: RegExp) => {
    const heading = screen.getByText(label);
    const table = heading.closest('.list-labels')!.nextElementSibling as HTMLElement;
    return within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
};

describe('MySubscriptionsPage sections', () => {
    beforeEach(() => {
        signIn();
    });

    it('lists cancelled subscriptions in their own section after My subscriptions', async () => {
        dashboardApi(subscriptions);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        const mySection = await screen.findByText('My subscriptions · 2');
        const cancelledSection = screen.getByText('Cancelled · 1');

        expect(rowsUnder(/^My subscriptions/)).toEqual(['Netflix', 'Spotify']);
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
        expect(mySection.compareDocumentPosition(cancelledSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByText(/other subscriptions/i)).not.toBeInTheDocument();
    });

    it('shows only the cancelled section when the Cancelled filter is selected', async () => {
        dashboardApi(subscriptions);
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await user.click(await screen.findByRole('button', { name: 'Cancelled 1' }));

        expect(screen.queryByText(/^My subscriptions/)).not.toBeInTheDocument();
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
    });

    it('splits the business view the same way', async () => {
        window.localStorage.setItem('valutir_dashboard_view', 'business');
        dashboardApi(subscriptions.map((item) => ({ ...item, b2b: true })));
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(await screen.findByRole('heading', { name: 'Business subscriptions' })).toBeInTheDocument();
        await screen.findByText('My subscriptions · 2');
        expect(rowsUnder(/^My subscriptions/)).toEqual(['Netflix', 'Spotify']);
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
    });
});
