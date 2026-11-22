import type {
    BackendSubscriptionStatus,
    SubscriptionCardModel,
    SubscriptionRecord,
} from '../types/subscription';
import { todayIsoDate } from '../utils/dates';
import { apiRequest } from './account';

/**
 * Every field a subscription write sets. The API replaces all of them on an update, so every write
 * sends the complete set: `createSubscription()` fills the defaults, `updateSubscription()` copies the
 * stored values. The review flag and price history are never part of it (they have their own calls).
 */
export type SubscriptionWrite = {
    serviceName: string;
    amount: number;
    currency: string;
    billingCadence: string;
    category: string | null;
    status: BackendSubscriptionStatus;
    startedAt: string | null;
    nextBillingDate: string | null;
    trialEndsAt: string | null;
    notes: string | null;
    manageUrl: string | null;
    autoRenew: boolean;
    b2b: boolean;
    /** Business only: paid with the owner's own card. */
    paidPersonally: boolean;
    /** Days before each charge the reminder goes out; null = the default for its cadence. Paid feature. */
    reminderLeadDays: number | null;
    householdShared: boolean;
    householdSize: number | null;
    cancelledAt: string | null;
    /** Paused only: the day it becomes active again. */
    resumesOn: string | null;
};

/** What a new subscription needs; the rest defaults to an active, auto-renewing, personal subscription started today. */
export type NewSubscription =
    Pick<SubscriptionWrite, 'serviceName' | 'amount' | 'currency' | 'billingCadence' | 'nextBillingDate'>
    & Partial<SubscriptionWrite>;

type StoredSubscription = SubscriptionRecord | SubscriptionCardModel;

/** A record from the API with its amount as a number, as the detail page and its cards use it. */
export const toCardModel = (subscription: SubscriptionRecord): SubscriptionCardModel => ({
    ...subscription,
    amount: Number(subscription.amount) || 0,
});

/**
 * The rules that tie fields together, applied to every write: a business subscription is never
 * household-shared, only a business subscription can be paid personally, and only a paused one
 * has a resume date.
 */
const consistent = (write: SubscriptionWrite): SubscriptionWrite => {
    const shared = write.householdShared && !write.b2b;

    return {
        ...write,
        paidPersonally: write.b2b && write.paidPersonally,
        householdShared: shared,
        householdSize: shared ? write.householdSize : null,
        resumesOn: write.status === 'paused' ? write.resumesOn : null,
    };
};

const writeOf = (subscription: StoredSubscription): SubscriptionWrite => ({
    serviceName: subscription.serviceName,
    amount: Number(subscription.amount),
    currency: subscription.currency,
    billingCadence: subscription.billingCadence,
    category: subscription.category,
    status: subscription.status as BackendSubscriptionStatus,
    startedAt: subscription.startedAt ?? null,
    nextBillingDate: subscription.nextBillingDate,
    trialEndsAt: subscription.trialEndsAt ?? null,
    notes: subscription.notes,
    manageUrl: subscription.manageUrl ?? null,
    autoRenew: subscription.autoRenew,
    b2b: subscription.b2b,
    paidPersonally: subscription.paidPersonally ?? false,
    reminderLeadDays: subscription.reminderLeadDays ?? null,
    householdShared: subscription.householdShared ?? false,
    householdSize: subscription.householdSize ?? null,
    cancelledAt: subscription.cancelledAt,
    resumesOn: subscription.resumesOn ?? null,
});

export const listSubscriptions = async (token: string): Promise<SubscriptionRecord[]> => {
    const data = await apiRequest<unknown>('/api/subs', { token, fallbackError: 'Failed to load subscriptions.' });

    return Array.isArray(data) ? data as SubscriptionRecord[] : [];
};

export const fetchSubscription = (token: string | null, id: number | string) =>
    apiRequest<SubscriptionRecord>(`/api/subs/${encodeURIComponent(id)}`, { token, fallbackError: 'Failed to load subscription.' });

export const createSubscription = (token: string | null, fields: NewSubscription) =>
    apiRequest<SubscriptionRecord>('/api/subs', {
        method: 'POST',
        token,
        body: consistent({
            category: null,
            status: 'active',
            startedAt: todayIsoDate(),
            trialEndsAt: null,
            notes: null,
            manageUrl: null,
            autoRenew: true,
            b2b: false,
            paidPersonally: false,
            reminderLeadDays: null,
            householdShared: false,
            householdSize: null,
            cancelledAt: null,
            resumesOn: null,
            ...fields,
        }),
        fallbackError: `Could not add ${fields.serviceName}.`,
    });

/** Saves `changes` to a stored subscription; every field not in `changes` is sent back as it is. */
export const updateSubscription = (token: string | null, current: StoredSubscription, changes: Partial<SubscriptionWrite>) =>
    apiRequest<SubscriptionRecord>(`/api/subs/${current.id}`, {
        method: 'PATCH',
        token,
        body: consistent({ ...writeOf(current), ...changes }),
        fallbackError: 'Failed to update the subscription.',
    });

/** Soft-deletes it; `usedAndUseful` is the owner's answer, kept with the record. */
export const deleteSubscription = (token: string | null, id: number, usedAndUseful: boolean) =>
    apiRequest<null>(`/api/subs/${id}`, {
        method: 'DELETE',
        token,
        body: { usedAndUseful },
        fallbackError: 'Failed to delete subscription.',
    });

/** Flags it for review, or changes the note of an existing flag. */
export const flagForReview = (token: string | null, id: number, note: string | null) =>
    apiRequest<SubscriptionRecord>(`/api/subs/${id}/review`, {
        method: 'PUT',
        token,
        body: { note },
        fallbackError: 'Could not save the review flag.',
    });

export const clearReviewFlag = (token: string | null, id: number) =>
    apiRequest<SubscriptionRecord>(`/api/subs/${id}/review`, {
        method: 'DELETE',
        token,
        fallbackError: 'Could not clear the review flag.',
    });

/** Removes a price change the owner says was a correction, not a real change. */
export const removePriceChange = (token: string | null, id: number, changeId: number) =>
    apiRequest<SubscriptionRecord>(`/api/subs/${id}/price-changes/${changeId}`, {
        method: 'DELETE',
        token,
        fallbackError: 'Could not remove it from the history.',
    });
