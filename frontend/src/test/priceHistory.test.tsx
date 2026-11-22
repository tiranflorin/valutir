import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../App';
import type { PriceChange, SubscriptionRecord } from '../types/subscription';
import { todayIsoDate } from '../utils/dates';
import { recentPriceChanges, recentRise, withinLastYear, yearlyDifference } from '../utils/priceHistory';
import { callsTo, mockApi, profile, signIn } from './api';

const change = (overrides: Partial<PriceChange> = {}): PriceChange => ({
    id: 1, previousAmount: '11.99', previousCurrency: 'EUR', previousCadence: 'monthly',
    newAmount: '13.99', newCurrency: 'EUR', newCadence: 'monthly', changedOn: '2026-11-01',
    ...overrides,
});

const record = (overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
    id: 1, serviceName: 'Netflix', amount: '13.99', currency: 'EUR', billingCadence: 'monthly', category: 'Streaming',
    status: 'active', startedAt: '2026-01-01', nextBillingDate: '2099-01-15', notes: null, manageUrl: null,
    isActive: true, autoRenew: true, b2b: false, paidPersonally: false, reminderLeadDays: null, householdShared: false, householdSize: null, cancelledAt: null,
    createdAt: '', updatedAt: '', trialEndsAt: null,
    resumesOn: null, reviewFlagged: false, reviewFlaggedAt: null, reviewNote: null, priceChanges: [],
    ...overrides,
});

const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return todayIsoDate(date);
};

describe('what a price change adds to a year', () => {
    it('compares yearly costs, also across a cadence change', () => {
        expect(yearlyDifference(change())).toBeCloseTo(24);
        // €9.99 a month to €99.99 a year saves €19.89 a year.
        expect(yearlyDifference(change({ previousAmount: '9.99', newAmount: '99.99', newCadence: 'yearly' }))).toBeCloseTo(-19.89);
    });

    it('never compares amounts in two currencies', () => {
        expect(yearlyDifference(change({ newCurrency: 'USD' }))).toBeNull();
    });

    it('counts the last 12 months up to today, not the same day a year ago', () => {
        expect(withinLastYear(change({ changedOn: '2025-11-16' }), '2026-11-15')).toBe(true);
        expect(withinLastYear(change({ changedOn: '2025-11-15' }), '2026-11-15')).toBe(false);
    });

    it('lists recent changes in the page currency, newest first, scaled to the user’s share', () => {
        const subscriptions = [
            record({ id: 1, householdShared: true, householdSize: 2, priceChanges: [change({ id: 1, changedOn: '2026-03-01' })] }),
            record({ id: 2, priceChanges: [change({ id: 2, changedOn: '2026-09-01' }), change({ id: 3, changedOn: '2024-01-01' })] }),
            record({ id: 3, priceChanges: [change({ id: 4, newCurrency: 'USD', previousCurrency: 'USD' })] }),
        ];

        const recent = recentPriceChanges(subscriptions, 'EUR', '2026-11-15', (subscription) => 1 / (subscription.householdSize ?? 1));

        expect(recent.map((item) => [item.change.id, Math.round(item.yearly)])).toEqual([[2, 24], [1, 12]]);
    });
});

describe('the price rise shown in the keep-or-cancel review', () => {
    it('is the latest change when it was a rise within the last year', () => {
        expect(recentRise(record({ priceChanges: [change({ changedOn: '2026-11-01' })] }), '2026-11-15')?.yearly).toBeCloseTo(24);
    });

    it('is nothing when the latest change was a cut, a currency change, or over a year ago', () => {
        const cutAfterRise = [change({ id: 2, previousAmount: '13.99', newAmount: '12.99', changedOn: '2026-11-01' }), change({ id: 1, changedOn: '2026-06-01' })];
        expect(recentRise(record({ priceChanges: cutAfterRise }), '2026-11-15')).toBeNull();
        expect(recentRise(record({ priceChanges: [change({ newCurrency: 'USD' })] }), '2026-11-15')).toBeNull();
        expect(recentRise(record({ priceChanges: [change({ changedOn: '2025-10-01' })] }), '2026-11-15')).toBeNull();
        expect(recentRise(record(), '2026-11-15')).toBeNull();
    });
});

describe('price history on the subscription page', () => {
    beforeEach(() => signIn());

    it('shows each change with what it adds a year, and removes one that was a correction', async () => {
        let subscription = record({ priceChanges: [change({ id: 7, changedOn: '2026-11-01' })] });
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs/1': () => ({ status: 200, body: subscription }),
            'DELETE /api/subs/1/price-changes/7': () => {
                subscription = { ...subscription, priceChanges: [] };
                return { status: 200, body: subscription };
            },
        });
        const user = userEvent.setup();
        render(<MemoryRouter initialEntries={['/subscriptions/1']}><App /></MemoryRouter>);

        const card = (await screen.findByRole('heading', { name: 'Price history' })).closest('section') as HTMLElement;
        expect(within(card).getByText('€11.99 a month → €13.99 a month')).toBeInTheDocument();
        expect(within(card).getByText('+€24.00 a year')).toBeInTheDocument();
        expect(within(card).getByText('Changed on 1 Nov 2026')).toBeInTheDocument();

        await user.click(within(card).getByRole('button', { name: 'Remove the change on 1 Nov 2026 from the history' }));

        expect(callsTo(calls, 'DELETE /api/subs/1/price-changes/7')).toHaveLength(1);
        expect(screen.queryByRole('heading', { name: 'Price history' })).not.toBeInTheDocument();
    });

    it('shows no price history card before the first change', async () => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs/1': () => ({ status: 200, body: record() }),
        });
        render(<MemoryRouter initialEntries={['/subscriptions/1']}><App /></MemoryRouter>);

        expect(await screen.findByRole('heading', { name: 'Subscription details' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Price history' })).not.toBeInTheDocument();
    });
});

describe('price changes on Insights', () => {
    beforeEach(() => signIn());

    const openInsights = (subscriptions: SubscriptionRecord[]) => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs': () => ({ status: 200, body: subscriptions }),
        });
        render(<MemoryRouter initialEntries={['/insights']}><App /></MemoryRouter>);
    };

    it('lists the last 12 months’ changes and what they add a year together', async () => {
        openInsights([
            record({ id: 1, serviceName: 'Netflix', priceChanges: [change({ id: 1, changedOn: daysAgo(30) })] }),
            record({ id: 2, serviceName: 'Spotify', amount: '9.99', priceChanges: [change({ id: 2, previousAmount: '10.99', newAmount: '9.99', changedOn: daysAgo(60) })] }),
            record({ id: 3, serviceName: 'Gym', amount: '50.00', priceChanges: [change({ id: 3, previousAmount: '40.00', newAmount: '50.00', changedOn: daysAgo(400) })] }),
        ]);

        const section = (await screen.findByRole('heading', { name: 'Price changes' })).closest('section') as HTMLElement;
        expect(within(section).getByTestId('insights-price-changes-total')).toHaveTextContent('Last 12 months · +€12.00 a year in total');
        expect(within(section).getAllByRole('listitem').map((item) => item.querySelector('a')?.textContent)).toEqual(['Netflix', 'Spotify']);
    });

    it('shows nothing when no price changed', async () => {
        openInsights([record({ id: 1 }), record({ id: 2, serviceName: 'Spotify' })]);

        expect(await screen.findByRole('heading', { name: 'By category' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Price changes' })).not.toBeInTheDocument();
    });
});
