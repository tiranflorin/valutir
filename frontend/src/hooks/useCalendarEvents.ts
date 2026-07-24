import { useMemo } from 'react';
import { mapSubscriptionToCalendarEvents } from '../utils/mapSubscriptionToCalendarEvents';
import { SubscriptionOccurrence } from '../types/calendar';
import { SubscriptionRecord } from '../types/subscription';

interface UseCalendarEventsInput {
    subscriptions: SubscriptionRecord[];
    rangeStart?: string;
    rangeEnd?: string;
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

const addFrequency = (date: Date, frequency: SubscriptionRecord['billingCadence']) => {
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
    return Boolean(subscription.nextBillingDate);
};

const buildOccurrences = (
    subscriptions: SubscriptionRecord[],
    rangeStart: string,
    rangeEnd: string
): SubscriptionOccurrence[] => {
    const start = parseDateOnly(rangeStart);
    const end = parseDateOnly(rangeEnd);
    const occurrences: SubscriptionOccurrence[] = [];

    subscriptions.forEach((subscription) => {
        if (!shouldIncludeSubscription(subscription) || !subscription.nextBillingDate) return;

        let cursor = parseDateOnly(subscription.nextBillingDate);

        while (cursor < end) {
            if (cursor >= start) {
                occurrences.push({
                    subscriptionId: String(subscription.id),
                    title: subscription.serviceName,
                    date: toIsoDate(cursor),
                    amount: Number(subscription.amount),
                    currency: subscription.currency,
                    ownerName: undefined,
                    category: subscription.category,
                    billingCadence: subscription.billingCadence,
                    paymentMethod: subscription.paymentMethod,
                    notes: subscription.notes,
                });
            }

            cursor = addFrequency(cursor, subscription.billingCadence);
        }
    });

    return occurrences;
};

const useCalendarEvents = ({
                               subscriptions,
                               rangeStart,
                               rangeEnd,
                           }: UseCalendarEventsInput) => {
    return useMemo(() => {
        if (!rangeStart || !rangeEnd) return [];

        const occurrences = buildOccurrences(subscriptions, rangeStart, rangeEnd);
        return mapSubscriptionToCalendarEvents(occurrences);
    }, [subscriptions, rangeStart, rangeEnd]);
};

export default useCalendarEvents;
