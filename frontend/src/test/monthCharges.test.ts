import { describe, expect, it } from 'vitest';
import { type ChargeSource, daysFromToday, monthCharges } from '../utils/monthCharges';

// 15 November 2026, local time.
const NOW = new Date(2026, 10, 15, 10, 30);

const sub = (extra: Partial<ChargeSource>): ChargeSource => ({
    id: 1,
    serviceName: 'Test',
    amount: '10.00',
    currency: 'EUR',
    billingCadence: 'monthly',
    status: 'active',
    nextBillingDate: '2026-11-20',
    startedAt: null,
    ...extra,
});

const charges = (subscription: Partial<ChargeSource>) =>
    monthCharges([sub(subscription)], undefined, NOW).map(({ date, paid }) => [date, paid]);

describe('this month’s charges', () => {
    it('lists a charge still to come this month as unpaid', () => {
        expect(charges({ nextBillingDate: '2026-11-20' })).toEqual([['2026-11-20', false]]);
    });

    it('counts a charge that already went out this month (the stored date was moved past it)', () => {
        expect(charges({ nextBillingDate: '2026-12-05' })).toEqual([['2026-11-05', true]]);
    });

    it('doesn’t count back to a charge after today when the billing date was set later on purpose', () => {
        expect(charges({ nextBillingDate: '2026-12-20' })).toEqual([]);
    });

    it('works for a later month too', () => {
        expect(monthCharges([sub({ nextBillingDate: '2026-11-20' })], undefined, NOW, new Date(2027, 0, 1))
            .map(({ date, paid }) => [date, paid])).toEqual([['2027-01-20', false]]);
    });

    it('treats a charge due today as still to pay', () => {
        expect(charges({ nextBillingDate: '2026-11-15' })).toEqual([['2026-11-15', false]]);
    });

    it('lists every weekly charge in the month, before and after today', () => {
        expect(charges({ billingCadence: 'weekly', nextBillingDate: '2026-11-19' })).toEqual([
            ['2026-11-05', true], ['2026-11-12', true], ['2026-11-19', false], ['2026-11-26', false],
        ]);
    });

    it('never counts back before the start date', () => {
        expect(charges({ billingCadence: 'weekly', nextBillingDate: '2026-11-19', startedAt: '2026-11-10' })).toEqual([
            ['2026-11-12', true], ['2026-11-19', false], ['2026-11-26', false],
        ]);
    });

    it('still finds this month’s charge when the stored date lies months in the past', () => {
        expect(charges({ nextBillingDate: '2026-09-10' })).toEqual([['2026-11-10', true]]);
    });

    it('clamps month-end dates like the calendar does', () => {
        expect(charges({ nextBillingDate: '2026-08-31' })).toEqual([['2026-11-30', false]]);
    });

    it('gives a trial only its first charge, never earlier ones', () => {
        expect(charges({ status: 'trial', nextBillingDate: '2026-11-25' })).toEqual([['2026-11-25', false]]);
        expect(charges({ status: 'trial', nextBillingDate: '2026-12-01', startedAt: '2026-01-01' })).toEqual([]);
    });

    it('skips cancelled subscriptions, missing dates and unknown cadences', () => {
        expect(charges({ status: 'cancelled' })).toEqual([]);
        expect(charges({ nextBillingDate: null })).toEqual([]);
        expect(charges({ billingCadence: 'daily' })).toEqual([]);
    });

    it('uses the given amount and sorts by date', () => {
        const result = monthCharges([
            sub({ id: 1, serviceName: 'Later', nextBillingDate: '2026-11-28', householdShared: true, householdSize: 2 }),
            sub({ id: 2, serviceName: 'Earlier', nextBillingDate: '2026-11-02', amount: '4.50', currency: 'USD' }),
        ], (subscription) => Number(subscription.amount) / (subscription.householdSize ?? 1), NOW);

        expect(result.map(({ serviceName, amount, currency }) => [serviceName, amount, currency])).toEqual([
            ['Earlier', 4.5, 'USD'],
            ['Later', 5, 'EUR'],
        ]);
    });
});

describe('days from today', () => {
    it('counts whole local days', () => {
        expect(daysFromToday('2026-11-15', NOW)).toBe(0);
        expect(daysFromToday('2026-11-16', NOW)).toBe(1);
        expect(daysFromToday('2026-12-15', NOW)).toBe(30);
        expect(daysFromToday('2026-11-10', NOW)).toBe(-5);
    });
});
