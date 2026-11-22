import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/account';
import { createSubscription, updateSubscription } from '../services/subscriptions';
import type { SubscriptionRecord } from '../types/subscription';
import { todayIsoDate } from '../utils/dates';
import { bodyOf, mockApi } from './api';

const stored = (overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
    id: 4,
    serviceName: 'Netflix',
    amount: '13.99',
    currency: 'EUR',
    status: 'active',
    billingCadence: 'monthly',
    category: 'Video streaming',
    startedAt: '2026-01-10',
    nextBillingDate: '2026-12-10',
    notes: 'Family plan',
    manageUrl: 'https://www.netflix.com/account',
    isActive: true,
    autoRenew: true,
    b2b: false,
    paidPersonally: false,
    reminderLeadDays: 5,
    householdShared: true,
    householdSize: 3,
    cancelledAt: null,
    createdAt: '2026-01-10T10:00:00+00:00',
    updatedAt: '2026-01-10T10:00:00+00:00',
    trialEndsAt: null,
    trialReminderSentAt: null,
    resumesOn: null,
    reviewFlagged: true,
    reviewFlaggedAt: '2026-11-01T10:00:00+00:00',
    reviewNote: 'Still watched?',
    priceChanges: [],
    ...overrides,
});

const sentBy = async (write: () => Promise<unknown>) => {
    const calls = mockApi({
        'POST /api/subs': () => ({ status: 201, body: stored() }),
        'PATCH /api/subs/4': () => ({ status: 200, body: stored() }),
    });
    await write();
    return bodyOf(calls[0]);
};

describe('subscription writes', () => {
    it('sends every stored field back on an update, with only the changes applied', async () => {
        const body = await sentBy(() => updateSubscription('t', stored(), { amount: 15.99 }));

        // Updates replace every field, so nothing the caller didn't mention may go missing.
        expect(body).toEqual({
            serviceName: 'Netflix', amount: 15.99, currency: 'EUR', billingCadence: 'monthly', category: 'Video streaming',
            status: 'active', startedAt: '2026-01-10', nextBillingDate: '2026-12-10', trialEndsAt: null, notes: 'Family plan',
            manageUrl: 'https://www.netflix.com/account', autoRenew: true, b2b: false, paidPersonally: false, reminderLeadDays: 5,
            householdShared: true, householdSize: 3, cancelledAt: null, resumesOn: null,
        });
        // The review flag and price history have their own calls and are never part of a write.
        expect(body).not.toHaveProperty('reviewNote');
        expect(body).not.toHaveProperty('priceChanges');
    });

    it('never shares a business subscription and keeps "paid personally" for business only', async () => {
        const toBusiness = await sentBy(() => updateSubscription('t', stored(), { b2b: true, paidPersonally: true }));
        expect(toBusiness).toMatchObject({ b2b: true, paidPersonally: true, householdShared: false, householdSize: null });

        const toPersonal = await sentBy(() => updateSubscription('t', stored({ b2b: true, paidPersonally: true, householdShared: false, householdSize: null }), { b2b: false }));
        expect(toPersonal).toMatchObject({ b2b: false, paidPersonally: false });

        const unshared = await sentBy(() => updateSubscription('t', stored(), { householdShared: false }));
        expect(unshared).toMatchObject({ householdShared: false, householdSize: null });
    });

    it('keeps a resume date only while paused', async () => {
        const paused = await sentBy(() => updateSubscription('t', stored(), { status: 'paused', resumesOn: '2027-01-01' }));
        expect(paused).toMatchObject({ status: 'paused', resumesOn: '2027-01-01' });

        const resumed = await sentBy(() => updateSubscription('t', stored({ status: 'paused', resumesOn: '2027-01-01' }), { status: 'active' }));
        expect(resumed).toMatchObject({ status: 'active', resumesOn: null });
    });

    it('creates an active, auto-renewing, personal subscription started today unless told otherwise', async () => {
        const body = await sentBy(() => createSubscription('t', {
            serviceName: 'Strava', amount: 59.99, currency: 'EUR', billingCadence: 'yearly', nextBillingDate: '2027-03-01',
        }));

        expect(body).toEqual({
            serviceName: 'Strava', amount: 59.99, currency: 'EUR', billingCadence: 'yearly', nextBillingDate: '2027-03-01',
            category: null, status: 'active', startedAt: todayIsoDate(), trialEndsAt: null, notes: null, manageUrl: null,
            autoRenew: true, b2b: false, paidPersonally: false, reminderLeadDays: null, householdShared: false,
            householdSize: null, cancelledAt: null, resumesOn: null,
        });
    });

    it('reports a failed write with its status and the first field error', async () => {
        mockApi({
            'PATCH /api/subs/4': () => ({ status: 422, body: { message: 'Validation failed.', errors: { manageUrl: ['Use a full https:// link.'] } } }),
            'POST /api/subs': () => ({ status: 401, body: { message: 'Expired JWT Token' } }),
        });

        await expect(updateSubscription('t', stored(), {})).rejects.toBeInstanceOf(ApiError);
        await expect(updateSubscription('t', stored(), {})).rejects.toMatchObject({ status: 422, message: 'Use a full https:// link.' });
        await expect(createSubscription('t', { serviceName: 'X', amount: 1, currency: 'EUR', billingCadence: 'monthly', nextBillingDate: null }))
            .rejects.toMatchObject({ status: 401 });
    });
});
