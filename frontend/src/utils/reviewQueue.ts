import type { SubscriptionRecord } from '../types/subscription';
import { monthlyEquivalentOf } from './insights';
import { daysFromToday } from './monthCharges';
import { findOverlaps } from './overlaps';

/** A trial ending within this many days goes to the front of the review. */
export const TRIAL_SOON_DAYS = 7;

export { yearlyCostOf } from './insights';

const trialEndsIn = (subscription: SubscriptionRecord, now: Date): number | null => {
    if (subscription.status !== 'trial') return null;
    const end = subscription.trialEndsAt || subscription.nextBillingDate;
    if (!end) return null;
    const days = daysFromToday(end.slice(0, 10), now);
    return days >= 0 && days <= TRIAL_SOON_DAYS ? days : null;
};

/**
 * The subscriptions to go through in a keep-or-cancel review, in order: trials ending in the next
 * 7 days (soonest first), then the ones flagged for review, then the ones that overlap another
 * subscription (utils/overlaps.ts), then the rest by monthly cost, highest first. Cancelled and
 * paused subscriptions aren't charged, so they're left out.
 */
export const reviewQueue = (subscriptions: SubscriptionRecord[], now: Date = new Date()): SubscriptionRecord[] => {
    const overlapping = new Set(findOverlaps(subscriptions).flatMap((overlap) =>
        overlap.kind === 'bundle' ? overlap.included : overlap.subscriptions).map((subscription) => subscription.id));
    const rank = (subscription: SubscriptionRecord) => {
        if (trialEndsIn(subscription, now) !== null) return 0;
        if (subscription.reviewFlagged) return 1;
        return overlapping.has(subscription.id) ? 2 : 3;
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
