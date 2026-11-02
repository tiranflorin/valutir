import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import SubscriptionInfoCard from '../components/subscription-detail/SubscriptionInfoCard';
import type { SubscriptionCardModel } from '../components/subscription-detail/SubscriptionHeaderCard';
import { renderWithMemoryRoute } from './test-utils';

const subscription = (id: number, serviceName: string, amount: string, sharing: { householdShared: boolean; householdSize: number | null }) => ({
    id, serviceName, amount, currency: 'EUR', billingCadence: 'monthly', category: 'Streaming', status: 'active',
    startedAt: '2026-01-01', nextBillingDate: '2099-01-15', cancelledAt: null, trialEndsAt: null, trialReminderSentAt: null,
    b2b: false, autoRenew: true, ...sharing,
});

// Netflix €13.99 split between 4 people (your share €3.50) and Spotify €10.00 not shared.
const subscriptions = [
    subscription(1, 'Netflix', '13.99', { householdShared: true, householdSize: 4 }),
    subscription(2, 'Spotify', '10.00', { householdShared: false, householdSize: null }),
];

const metricCard = (label: string) => screen.getByText(label).closest('.metric-card') as HTMLElement;
const serviceRows = () => screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('household sharing on the dashboard', () => {
    beforeEach(() => {
        window.localStorage.setItem('valutir_auth_token', `header.${btoa(JSON.stringify({ username: 'ada@example.test' }))}.signature`);
        window.localStorage.setItem('valutir_dashboard_view', 'personal');
        vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
            String(url).endsWith('/api/subs') ? subscriptions : { email: 'ada@example.test', name: 'Ada', defaultCurrency: 'EUR', pendingEmail: null },
        ), { status: 200 })));
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('tags shared subscriptions and summarises your share', async () => {
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await screen.findByText('My subscriptions · 2');

        expect(within(screen.getByRole('row', { name: /netflix/i })).getByText('Shared')).toBeInTheDocument();
        expect(within(screen.getByRole('row', { name: /spotify/i })).queryByText('Shared')).not.toBeInTheDocument();
        expect(metricCard('Shared with household')).toHaveTextContent('1 service');
        expect(metricCard('Shared with household')).toHaveTextContent('€3.50 / month your share');
    });

    it('filters to shared subscriptions', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await user.click(await screen.findByRole('button', { name: 'Shared 1' }));

        expect(screen.getByText('My subscriptions · 1')).toBeInTheDocument();
        expect(serviceRows()).toEqual(['NetflixShared']);
    });

    it('switches totals between full bills and your share', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await screen.findByText('My subscriptions · 2');

        expect(metricCard('Tracked recurring bills')).toHaveTextContent('€23.99');
        expect(screen.getByRole('row', { name: /netflix/i })).toHaveTextContent('€13.99');

        await user.click(screen.getByRole('button', { name: 'My share' }));

        expect(metricCard('Tracked recurring bills')).toHaveTextContent('€13.50');
        expect(metricCard('Tracked recurring bills')).toHaveTextContent('your share of shared bills');
        const netflixRow = screen.getByRole('row', { name: /netflix/i });
        expect(netflixRow).toHaveTextContent('€3.50');
        expect(netflixRow).toHaveTextContent('of €13.99');
        expect(screen.getByRole('row', { name: /spotify/i })).toHaveTextContent('€10.00');
    });

    it('hides the switch when nothing is shared', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
            String(url).endsWith('/api/subs') ? [subscriptions[1]] : { email: 'ada@example.test', name: 'Ada', defaultCurrency: 'EUR', pendingEmail: null },
        ), { status: 200 })));
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });
        await screen.findByText('My subscriptions · 1');

        expect(screen.queryByRole('button', { name: 'My share' })).not.toBeInTheDocument();
        expect(metricCard('Shared with household')).toHaveTextContent('0 services');
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
