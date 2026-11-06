import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsightsPage from '../pages/InsightsPage';
import { mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const subscription = (id: number, serviceName: string, extra: Record<string, unknown> = {}) => ({
    id,
    serviceName,
    amount: '10.00',
    currency: 'EUR',
    billingCadence: 'monthly',
    category: 'Streaming',
    status: 'active',
    startedAt: '2026-01-01',
    nextBillingDate: '2030-01-15',
    cancelledAt: null,
    trialEndsAt: null,
    trialReminderSentAt: null,
    b2b: false,
    autoRenew: true,
    householdShared: false,
    householdSize: null,
    ...extra,
});

const items = [
    subscription(1, 'Netflix'),
    subscription(2, 'Disney', { amount: '120.00', billingCadence: 'yearly' }),
    subscription(3, 'Spotify', { amount: '5.00', category: 'Music' }),
    subscription(4, 'GitHub', { amount: '4.00', currency: 'USD', category: 'Developer tools' }),
    subscription(5, 'Old Hosting', { status: 'cancelled', amount: '99.00' }),
    subscription(6, 'Figma', { amount: '15.00', b2b: true, category: 'Design' }),
];

const insightsApi = (subs: unknown[]) => mockApi({
    'GET /api/profile': () => ({ status: 200, body: profile() }),
    'GET /api/subs': () => ({ status: 200, body: subs }),
});

describe('InsightsPage', () => {
    beforeEach(() => {
        signIn();
    });

    it('shows personal totals and categories in the default currency, without cancelled or business ones', async () => {
        insightsApi(items);
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        expect(await screen.findByTestId('insights-monthly')).toHaveTextContent('€25.00');
        expect(screen.getByTestId('insights-yearly')).toHaveTextContent('€300.00');

        const categories = screen.getByRole('heading', { name: 'By category' }).closest('section') as HTMLElement;
        const rows = within(categories).getAllByRole('button').map((row) => row.textContent);
        expect(rows).toEqual(['Streaming€20.0080%', 'Music€5.0020%']);
    });

    it('switches to another currency without converting', async () => {
        insightsApi(items);
        const user = userEvent.setup();
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        await user.click(await screen.findByRole('button', { name: 'USD' }));

        expect(screen.getByTestId('insights-monthly')).toHaveTextContent('US$4.00');
        expect(screen.getByText(/Showing USD subscriptions only/)).toBeInTheDocument();
    });

    it('lists a category’s subscriptions when its bar is opened', async () => {
        insightsApi(items);
        const user = userEvent.setup();
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        await user.click(await screen.findByRole('button', { name: /^Streaming/ }));

        const members = screen.getByRole('list', { name: 'Streaming subscriptions' });
        expect(within(members).getAllByRole('link').map((link) => link.textContent)).toEqual(['Netflix', 'Disney']);
    });

    it('shows the business view on its own, tagging yearly renewals among the biggest charges', async () => {
        window.localStorage.setItem('valutir_dashboard_view', 'business');
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        const inThirtyDays = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`;
        insightsApi([...items, subscription(7, 'Domain', { b2b: true, amount: '120.00', billingCadence: 'yearly', nextBillingDate: inThirtyDays })]);
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        expect(await screen.findByTestId('insights-monthly')).toHaveTextContent('€25.00');
        expect(screen.queryByRole('button', { name: 'USD' })).not.toBeInTheDocument();
        const upcoming = screen.getByRole('heading', { name: 'Biggest charges coming' }).closest('section') as HTMLElement;
        expect(within(within(upcoming).getAllByRole('listitem')[0]).getByText('Yearly')).toBeInTheDocument();
    });

    it('counts only the user’s share when My share is picked', async () => {
        insightsApi([subscription(1, 'Netflix', { householdShared: true, householdSize: 2 })]);
        const user = userEvent.setup();
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        expect(await screen.findByTestId('insights-monthly')).toHaveTextContent('€10.00');
        expect(screen.getByTestId('insights-shared-share')).toHaveTextContent('Your share of shared bills: €5.00 / month');
        await user.click(screen.getByRole('button', { name: 'My share' }));
        expect(screen.getByTestId('insights-monthly')).toHaveTextContent('€5.00');
    });
});
