import { describe, expect, it } from 'vitest';
import { buildRecurringOccurrences, nextChargeOnOrAfter } from '../utils/buildRecurringOccurrences';
import type { SubscriptionRecord } from '../types/subscription';

const subscription = (billingCadence: SubscriptionRecord['billingCadence'], nextBillingDate: string): SubscriptionRecord => ({
    id: 1, serviceName: 'Test', amount: '10.00', currency: 'EUR', status: 'active', billingCadence, category: null,
    startedAt: null, nextBillingDate, notes: null, paymentMethod: null, manageUrl: null, isActive: true, autoRenew: true, b2b: false,
    householdShared: false, householdSize: null, cancelledAt: null, createdAt: '', updatedAt: '', trialEndsAt: null, trialReminderSentAt: null,
    resumesOn: null, reviewFlagged: false, reviewFlaggedAt: null, reviewNote: null,
});

const dates = (cadence: SubscriptionRecord['billingCadence'], anchor: string, rangeStart: string, rangeEnd: string) =>
    buildRecurringOccurrences({ subscriptions: [subscription(cadence, anchor)], rangeStart, rangeEnd }).map((o) => o.date);

describe('calendar recurrence', () => {
    it('clamps month-end charges instead of drifting into the next month', () => {
        // Previously: 31 Jan -> 3 Mar -> 3 Apr (JavaScript rolled 31 Feb over into March).
        expect(dates('monthly', '2026-01-31', '2026-01-01', '2026-05-01')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    });

    it('handles leap days on yearly subscriptions', () => {
        expect(dates('yearly', '2024-02-29', '2024-01-01', '2029-01-01')).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
    });

    it('starts from the stored date and only returns charges inside the range', () => {
        expect(dates('weekly', '2026-10-01', '2026-11-01', '2026-11-16')).toEqual(['2026-11-05', '2026-11-12']);
        expect(dates('quarterly', '2026-01-15', '2026-03-01', '2027-01-01')).toEqual(['2026-04-15', '2026-07-15', '2026-10-15']);
    });
});

describe('paused subscriptions', () => {
    it('put nothing on the calendar until they resume', () => {
        const paused = { ...subscription('monthly', '2026-11-20'), status: 'paused' as const };
        expect(buildRecurringOccurrences({ subscriptions: [paused], rangeStart: '2026-11-01', rangeEnd: '2027-02-01' })).toEqual([]);
    });
});

describe('next charge after a restart', () => {
    it('counts from the restart date, including the restart day itself', () => {
        expect(nextChargeOnOrAfter('2026-11-06', 'monthly', '2026-11-06')).toBe('2026-11-06');
        expect(nextChargeOnOrAfter('2026-10-20', 'monthly', '2026-11-06')).toBe('2026-11-20');
        expect(nextChargeOnOrAfter('2026-08-31', 'monthly', '2026-11-06')).toBe('2026-11-30');
        expect(nextChargeOnOrAfter('2026-10-20', 'weekly', '2026-11-06')).toBe('2026-11-10');
        expect(nextChargeOnOrAfter('2026-02-01', 'yearly', '2026-11-06')).toBe('2027-02-01');
    });
});
