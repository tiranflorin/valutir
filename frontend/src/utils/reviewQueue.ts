import type { SubscriptionRecord } from '../types/subscription';
import { monthlyEquivalentOf } from './insights';
import { daysFromToday } from './monthCharges';

/** A trial ending within this many days goes to the front of the review. */
export const TRIAL_SOON_DAYS = 7;

/** What one bill costs in a year: weekly × 52, monthly × 12, quarterly × 4, yearly × 1. */
export const yearlyCostOf = (amount: number, cadence: string): number =>
    cadence.toLowerCase() === 'weekly' ? amount * 52 : monthlyEquivalentOf(amount, cadence) * 12;

const trialEndsIn = (subscription: SubscriptionRecord, now: Date): number | null => {
    if (subscription.status !== 'trial') return null;
    const end = subscription.trialEndsAt || subscription.nextBillingDate;
    if (!end) return null;
    const days = daysFromToday(end.slice(0, 10), now);
    return days >= 0 && days <= TRIAL_SOON_DAYS ? days : null;
};

/**
 * The subscriptions to go through in a keep-or-cancel review, in order: trials ending in the next
 * 7 days (soonest first), then the ones flagged for review, then the rest by monthly cost, highest
 * first. Cancelled and paused subscriptions aren't charged, so they're left out.
 */
export const reviewQueue = (subscriptions: SubscriptionRecord[], now: Date = new Date()): SubscriptionRecord[] => {
    const rank = (subscription: SubscriptionRecord) => {
        if (trialEndsIn(subscription, now) !== null) return 0;
        return subscription.reviewFlagged ? 1 : 2;
    };
    const monthly = (subscription: SubscriptionRecord) =>
        monthlyEquivalentOf(Number(subscription.amount) || 0, subscription.billingCadence);

    return subscriptions
        .filter((subscription) => subscription.status === 'active' || subscription.status === 'trial')
        .sort((a, b) =>
            rank(a) - rank(b)
            || (rank(a) === 0 ? (trialEndsIn(a, now) ?? 0) - (trialEndsIn(b, now) ?? 0) : 0)
            || monthly(b) - monthly(a)
            || a.serviceName.localeCompare(b.serviceName));
};
