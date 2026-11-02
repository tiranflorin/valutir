import type { SubscriptionOccurrence } from '../types/calendar';
import type { SubscriptionRecord } from '../types/subscription';

interface BuildRecurringOccurrencesInput {
    subscriptions: SubscriptionRecord[];
    rangeStart: string;
    rangeEnd: string;
}

const extractDatePart = (value: string) => value.slice(0, 10);

const parseDateOnly = (value: string) => {
    const [year, month, day] = extractDatePart(value).split('-').map(Number);
    return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addMonthsClamped = (anchor: Date, months: number) => {
    const target = new Date(anchor.getFullYear(), anchor.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(anchor.getDate(), lastDay));
    return target;
};

/**
 * Charge number n (0 = the anchor), counted from the anchor rather than the previous charge, so
 * month-end dates clamp instead of drifting: 31 Jan -> 28 Feb -> 31 Mar. Same rule as the
 * backend's BillingSchedule. Returns null for an unknown cadence.
 */
export const chargeDate = (
    anchor: Date,
    frequency: SubscriptionRecord['billingCadence'],
    n: number
): Date | null => {
    switch (frequency) {
        case 'daily':
            return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + n);
        case 'weekly':
            return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * n);
        case 'monthly':
            return addMonthsClamped(anchor, n);
        case 'quarterly':
            return addMonthsClamped(anchor, 3 * n);
        case 'yearly':
            return addMonthsClamped(anchor, 12 * n);
        default:
            return n === 0 ? new Date(anchor) : null;
    }
};

const shouldIncludeSubscription = (subscription: SubscriptionRecord) => {
    if (!subscription.nextBillingDate) return false;
    if (subscription.status === 'cancelled' && !subscription.autoRenew) return false;
    return true;
};

export const buildRecurringOccurrences = ({
                                              subscriptions,
                                              rangeStart,
                                              rangeEnd,
                                          }: BuildRecurringOccurrencesInput): SubscriptionOccurrence[] => {
    const start = parseDateOnly(rangeStart);
    const end = parseDateOnly(rangeEnd);
    const occurrences: SubscriptionOccurrence[] = [];

    subscriptions.forEach((subscription) => {
        if (!shouldIncludeSubscription(subscription)) return;

        const anchor = parseDateOnly(subscription.nextBillingDate as string);

        for (let n = 0; ; n += 1) {
            const cursor = chargeDate(anchor, subscription.billingCadence, n);
            if (!cursor || cursor >= end) break;
            if (cursor >= start) {
                occurrences.push({
                    subscriptionId: String(subscription.id),
                    title: subscription.serviceName,
                    date: toIsoDate(cursor),
                    amount: Number(subscription.amount),
                    currency: subscription.currency,
                    ownerName: undefined,
                });
            }
        }
    });

    return occurrences;
};
