import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddSubscriptionPage from '../pages/AddSubscriptionPage';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import SubscriptionInfoCard from '../components/subscription-detail/SubscriptionInfoCard';
import type { SubscriptionCardModel } from '../components/subscription-detail/SubscriptionHeaderCard';
import { householdPayload, shareOf, splitCount } from '../utils/householdShare';
import { todayIsoDate } from '../utils/dates';
import { bodyOf, callsTo, mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const subscription = (id: number, serviceName: string, amount: string, sharing: { householdShared: boolean; householdSize: number | null }) => ({
    id, serviceName, amount, currency: 'EUR', billingCadence: 'monthly', category: 'Streaming', status: 'active',
    startedAt: '2026-01-01', nextBillingDate: '2099-01-15', cancelledAt: null, trialEndsAt: null, trialReminderSentAt: null,
    b2b: false, autoRenew: true, ...sharing,
});

// Netflix €13.99 split between 4 people (your share €3.50) and Spotify €10.00 not shared.
const netflix = subscription(1, 'Netflix', '13.99', { householdShared: true, householdSize: 4 });
const spotify = subscription(2, 'Spotify', '10.00', { householdShared: false, householdSize: null });

const dashboardApi = (subscriptions: unknown[]) => mockApi({
    'GET /api/profile': () => ({ status: 200, body: profile() }),
    'GET /api/subs': () => ({ status: 200, body: subscriptions }),
});

const monthAverage = () => screen.getByTestId('month-average');
const serviceRows = () => screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);

beforeEach(() => {
    signIn();
});

describe('household share helpers', () => {
    it('splits equally and treats unshared subscriptions as one person', () => {
        expect(shareOf(13.99, { householdShared: true, householdSize: 4 })).toBeCloseTo(3.4975);
        expect(splitCount({ householdShared: false, householdSize: 4 })).toBe(1);
        expect(splitCount({ householdShared: true, householdSize: null })).toBe(1);
    });

    it('never sends sharing for business subscriptions', () => {
        expect(householdPayload({ householdShared: true, householdSize: 3, b2b: false })).toEqual({ householdShared: true, householdSize: 3 });
        expect(householdPayload({ householdShared: true, householdSize: 3, b2b: true })).toEqual({ householdShared: false, householdSize: null });
        expect(householdPayload({ householdShared: false, householdSize: 3, b2b: false })).toEqual({ householdShared: false, householdSize: null });
    });
});

describe('household sharing on the add form', () => {
    it('shows the split and your share, and sends both to the API', async () => {
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'POST /api/subs': () => ({ status: 201, body: { id: 1 } }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/subscriptions/new' });
        fireEvent.change(screen.getByLabelText(/service name/i), { target: { value: 'Netflix' } });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '13.99' } });
        fireEvent.change(screen.getByLabelText(/next billing date/i), { target: { value: todayIsoDate() } });

        await user.click(screen.getByRole('button', { name: /optional details/i }));
        await user.click(screen.getByRole('button', { name: 'Not shared' }));
        await user.click(screen.getByRole('combobox', { name: /split between/i }));
        await user.click(screen.getByRole('option', { name: '4 people' }));

        expect(screen.getByText(/your share/i)).toHaveTextContent('Your share: 3.50 EUR per monthly bill');

        await user.click(screen.getByRole('button', { name: 'Save subscription' }));
        const create = await vi.waitFor(() => {
            const [call] = callsTo(calls, 'POST /api/subs');
            expect(call).toBeDefined();
            return call;
        });
        expect(bodyOf(create)).toMatchObject({ householdShared: true, householdSize: 4, b2b: false });
    });

    it('hides sharing for business subscriptions and turns it off', async () => {
        dashboardApi([]);
        const user = userEvent.setup();
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/subscriptions/new' });
        await user.click(screen.getByRole('button', { name: /optional details/i }));
        await user.click(screen.getByRole('button', { name: 'Not shared' }));
        expect(screen.getByRole('button', { name: 'Shared' })).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: /business subscription/i }));

        expect(screen.queryByText('Household shared')).not.toBeInTheDocument();
        await user.click(screen.getByRole('checkbox', { name: /business subscription/i }));
        expect(screen.getByRole('button', { name: 'Not shared' })).toBeInTheDocument();
    });
});

describe('household sharing on the dashboard', () => {
    it('tags shared subscriptions', async () => {
        dashboardApi([netflix, spotify]);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await screen.findByText('My subscriptions · 2');

        expect(within(screen.getByRole('row', { name: /netflix/i })).getByText('Shared')).toBeInTheDocument();
        expect(within(screen.getByRole('row', { name: /spotify/i })).queryByText('Shared')).not.toBeInTheDocument();
    });

    it('filters to shared subscriptions', async () => {
        dashboardApi([netflix, spotify]);
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await user.click(await screen.findByRole('button', { name: 'Shared 1' }));

        expect(screen.getByText('My subscriptions · 1')).toBeInTheDocument();
        expect(serviceRows()).toEqual(['NetflixShared']);
    });

    it('switches totals between full bills and your share', async () => {
        dashboardApi([netflix, spotify]);
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await screen.findByText('My subscriptions · 2');

        expect(monthAverage()).toHaveTextContent('€23.99 / month on average');
        expect(screen.getByRole('row', { name: /netflix/i })).toHaveTextContent('€13.99');

        await user.click(screen.getByRole('button', { name: 'My share' }));

        expect(monthAverage()).toHaveTextContent('€13.50 / month on average');
        const netflixRow = screen.getByRole('row', { name: /netflix/i });
        expect(netflixRow).toHaveTextContent('€3.50');
        expect(netflixRow).toHaveTextContent('of €13.99');
        expect(screen.getByRole('row', { name: /spotify/i })).toHaveTextContent('€10.00');
    });

    it('hides the switch when nothing is shared', async () => {
        dashboardApi([spotify]);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await screen.findByText('My subscriptions · 1');

        expect(screen.queryByRole('button', { name: 'My share' })).not.toBeInTheDocument();
    });
});

describe('household sharing on the detail page', () => {
    const base: SubscriptionCardModel = {
        id: 1, serviceName: 'Netflix', category: 'Streaming', amount: 13.99, currency: 'EUR', billingCadence: 'monthly',
        nextBillingDate: '2099-01-15', notes: null, status: 'active', autoRenew: true, b2b: false, cancelledAt: null,
    };

    it('shows the split and your share for a shared subscription', () => {
        render(<SubscriptionInfoCard subscription={{ ...base, householdShared: true, householdSize: 4 }} />);

        expect(screen.getByText('Yes · split between 4')).toBeInTheDocument();
        expect(screen.getByText('Your share: €3.50 per monthly bill')).toBeInTheDocument();
    });

    it('shows "No" for personal subscriptions and nothing for business ones', () => {
        const { rerender } = render(<SubscriptionInfoCard subscription={base} />);
        expect(screen.getByText('Household shared').nextSibling).toHaveTextContent('No');

        rerender(<SubscriptionInfoCard subscription={{ ...base, b2b: true }} />);
        expect(screen.queryByText('Household shared')).not.toBeInTheDocument();
    });
});
