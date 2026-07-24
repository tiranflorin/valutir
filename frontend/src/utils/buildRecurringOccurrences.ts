import { SubscriptionOccurrence } from '../types/calendar';
import { SubscriptionRecord } from '../types/subscription';

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

const addFrequency = (
    date: Date,
    frequency: SubscriptionRecord['billingCadence']
) => {
    const next = new Date(date);

    switch (frequency) {
        case 'weekly':
            next.setDate(next.getDate() + 7);
            return next;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            return next;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            return next;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            return next;
        default:
            return next;
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

        let cursor = parseDateOnly(subscription.nextBillingDate as string);

        while (cursor < end) {
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

            cursor = addFrequency(cursor, subscription.billingCadence);
        }
    });

    return occurrences;
};
