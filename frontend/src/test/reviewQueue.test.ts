import { describe, expect, it } from 'vitest';
import type { SubscriptionRecord } from '../types/subscription';
import { reviewQueue, yearlyCostOf } from '../utils/reviewQueue';

// 15 November 2026, local time.
const NOW = new Date(2026, 10, 15, 10, 30);

const sub = (id: number, serviceName: string, extra: Partial<SubscriptionRecord> = {}) => ({
    id,
    serviceName,
    amount: '10.00',
    currency: 'EUR',
    billingCadence: 'monthly',
    status: 'active',
    nextBillingDate: '2026-12-01',
    trialEndsAt: null,
    reviewFlagged: false,
    ...extra,
}) as SubscriptionRecord;

describe('keep-or-cancel review order', () => {
    it('puts trials ending this week first, then flagged ones, then the rest by monthly cost', () => {
        const queue = reviewQueue([
            sub(1, 'Cheap', { amount: '3.00' }),
            sub(2, 'Yearly', { amount: '240.00', billingCadence: 'yearly' }), // €20 a month
            sub(3, 'Flagged', { amount: '1.00', reviewFlagged: true }),
            sub(4, 'Trial later', { status: 'trial', trialEndsAt: '2026-12-20' }),
            sub(5, 'Trial in 5 days', { status: 'trial', trialEndsAt: '2026-11-20' }),
            sub(6, 'Trial tomorrow', { status: 'trial', trialEndsAt: '2026-11-16' }),
            sub(7, 'Weekly', { amount: '4.00', billingCadence: 'weekly' }), // about €17.33 a month
        ], NOW);

        expect(queue.map(({ serviceName }) => serviceName)).toEqual([
            'Trial tomorrow', 'Trial in 5 days', 'Flagged', 'Yearly', 'Weekly', 'Trial later', 'Cheap',
        ]);
    });

    it('leaves out paused and cancelled subscriptions', () => {
        const queue = reviewQueue([
            sub(1, 'Active'),
            sub(2, 'Paused', { status: 'paused' }),
            sub(3, 'Cancelled', { status: 'cancelled' }),
        ], NOW);

        expect(queue.map(({ serviceName }) => serviceName)).toEqual(['Active']);
    });
});

describe('yearly cost', () => {
    it('multiplies by the charges in a year', () => {
        expect(yearlyCostOf(4, 'weekly')).toBe(208);
        expect(yearlyCostOf(10, 'monthly')).toBe(120);
        expect(yearlyCostOf(30, 'quarterly')).toBe(120);
        expect(yearlyCostOf(99, 'yearly')).toBe(99);
    });
});
