import { describe, expect, it } from 'vitest';
import {
    biggestUpcoming,
    categoryBreakdown,
    currenciesOf,
    monthlyEquivalentOf,
    monthlyForecast,
} from '../utils/insights';
import type { ChargeSource } from '../utils/monthCharges';

// 15 November 2026, local time.
const NOW = new Date(2026, 10, 15, 10, 30);
const full = (subscription: ChargeSource) => Number(subscription.amount) || 0;

let nextId = 1;
const sub = (extra: Partial<ChargeSource>): ChargeSource => ({
    id: nextId++,
    serviceName: 'Test',
    amount: '10.00',
    currency: 'EUR',
    billingCadence: 'monthly',
    status: 'active',
    nextBillingDate: '2026-11-20',
    startedAt: null,
    category: null,
    ...extra,
});

describe('monthly equivalent', () => {
    it('spreads weekly, quarterly and yearly bills over months', () => {
        expect(monthlyEquivalentOf(12, 'weekly')).toBe(52);
        expect(monthlyEquivalentOf(10, 'monthly')).toBe(10);
        expect(monthlyEquivalentOf(30, 'quarterly')).toBe(10);
        expect(monthlyEquivalentOf(120, 'yearly')).toBe(10);
    });
});

describe('currencies', () => {
    it('puts the preferred currency first when it is used', () => {
        const items = [sub({ currency: 'USD' }), sub({ currency: 'RON' }), sub({ currency: 'EUR' })];
        expect(currenciesOf(items, 'EUR')).toEqual(['EUR', 'RON', 'USD']);
        expect(currenciesOf(items.slice(0, 2), 'EUR')).toEqual(['RON', 'USD']);
    });
});

describe('category breakdown', () => {
    it('adds monthly equivalents per category, largest first, with shares', () => {
        const rows = categoryBreakdown([
            sub({ serviceName: 'Netflix', category: 'Streaming' }),
            sub({ serviceName: 'Disney', category: 'Streaming', amount: '120', billingCadence: 'yearly' }),
            sub({ serviceName: 'Spotify', category: 'Music', amount: '5' }),
            sub({ serviceName: 'Misc', category: '  ', amount: '5' }),
        ], full);

        expect(rows.map(({ category, monthly, share }) => [category, monthly, share])).toEqual([
            ['Streaming', 20, 20 / 30],
            ['Music', 5, 5 / 30],
            ['Uncategorized', 5, 5 / 30],
        ]);
        expect(rows[0].subscriptions.map((item) => item.serviceName)).toEqual(['Netflix', 'Disney']);
    });

    it('uses the given amount, e.g. the user’s share', () => {
        const rows = categoryBreakdown([sub({ category: 'Streaming', householdShared: true, householdSize: 2 })],
            (subscription) => full(subscription) / (subscription.householdSize ?? 1));
        expect(rows[0].monthly).toBe(5);
    });
});

describe('12-month forecast', () => {
    it('totals each month from now, with the uneven months from yearly bills', () => {
        const forecast = monthlyForecast([
            sub({ nextBillingDate: '2026-11-20' }),
            sub({ amount: '120', billingCadence: 'yearly', nextBillingDate: '2027-03-10' }),
        ], full, NOW);

        expect(forecast).toHaveLength(12);
        expect(forecast[0]).toEqual({ month: '2026-11', total: 10, count: 1 });
        expect(forecast[4]).toEqual({ month: '2027-03', total: 130, count: 2 });
        expect(forecast[11].month).toBe('2027-10');
    });

    it('counts this month’s charges that already went out', () => {
        expect(monthlyForecast([sub({ nextBillingDate: '2026-12-05' })], full, NOW)[0]).toEqual({ month: '2026-11', total: 10, count: 1 });
    });

    it('doesn’t invent charges before a billing date set later on purpose', () => {
        const forecast = monthlyForecast([sub({ nextBillingDate: '2027-01-20' })], full, NOW);
        expect(forecast.slice(0, 3).map((month) => month.count)).toEqual([0, 0, 1]);
    });
});

describe('biggest charges coming', () => {
    it('lists charges in the next 90 days, largest first, leaving out paid and later ones', () => {
        const upcoming = biggestUpcoming([
            sub({ serviceName: 'Monthly', nextBillingDate: '2026-12-05' }),
            sub({ serviceName: 'Yearly', amount: '120', billingCadence: 'yearly', nextBillingDate: '2027-01-10' }),
            sub({ serviceName: 'Too late', amount: '500', billingCadence: 'yearly', nextBillingDate: '2027-03-01' }),
        ], full, NOW);

        expect(upcoming.map(({ serviceName, date }) => [serviceName, date])).toEqual([
            ['Yearly', '2027-01-10'],
            ['Monthly', '2026-12-05'],
            ['Monthly', '2027-01-05'],
            ['Monthly', '2027-02-05'],
        ]);
    });
});
