import { chargeDate } from './buildRecurringOccurrences';
import { todayIsoDate } from './dates';
import type { SubscriptionRecord } from '../types/subscription';

/** The fields a month's charges are worked out from. */
export type ChargeSource = {
    id: number;
    serviceName: string;
    amount: number | string;
    currency: string;
    billingCadence: string;
    status: string;
    nextBillingDate: string | null;
    startedAt?: string | null;
    category?: string | null;
    householdShared?: boolean;
    householdSize?: number | null;
};

export type MonthCharge = {
    subscriptionId: number;
    serviceName: string;
    /** YYYY-MM-DD. */
    date: string;
    amount: number;
    currency: string;
    billingCadence: string;
    /** The charge date is before today: it has gone out. A charge due today is still to pay. */
    paid: boolean;
};

/** The cadences the app supports; rows saved earlier may still hold others (e.g. daily). */
const CADENCES: readonly string[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

const parseDateOnly =(value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Every charge in the calendar month that contains `month` (default: the current month), both the
 * ones already gone out and the ones still to come, sorted by date.
 *
 * Charges are counted from the stored `nextBillingDate` with the same month-end clamping as the
 * calendar and the backend's BillingSchedule. Charges before it are counted backwards (the hourly
 * command moves `nextBillingDate` past each charge), but only those already in the past, never
 * before `startedAt`, and never for a trial, whose first charge is its `nextBillingDate`. Cancelled
 * and paused subscriptions and unknown cadences give no charges. The figures are estimates: the app doesn't
 * see real payments.
 */
export const monthCharges = (
    subscriptions: ChargeSource[],
    amountFor: (subscription: ChargeSource) => number = (subscription) => Number(subscription.amount) || 0,
    now: Date = new Date(),
    month: Date = now,
): MonthCharge[] => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const nextMonthStart = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const today = todayIsoDate(now);
    const charges: MonthCharge[] = [];

    subscriptions.forEach((subscription) => {
        const status = subscription.status.toLowerCase();
        if (status === 'cancelled' || status === 'paused' || !subscription.nextBillingDate) return;

        const cadence = subscription.billingCadence.toLowerCase() as SubscriptionRecord['billingCadence'];
        if (!CADENCES.includes(cadence)) return;
        const anchor = parseDateOnly(subscription.nextBillingDate);
        const startedAt = subscription.startedAt ? parseDateOnly(subscription.startedAt) : null;
        const add = (date: Date) => {
            const iso = todayIsoDate(date);
            charges.push({
                subscriptionId: subscription.id,
                serviceName: subscription.serviceName,
                date: iso,
                amount: amountFor(subscription),
                currency: subscription.currency || 'EUR',
                billingCadence: cadence,
                paid: iso < today,
            });
        };

        // From the stored date forwards (it can lie before this month if the dates weren't advanced).
        for (let n = 0; ; n += 1) {
            const date = chargeDate(anchor, cadence, n);
            if (!date || date >= nextMonthStart) break;
            if (date >= monthStart) add(date);
        }

        if (status === 'trial') return;

        // Backwards from the stored date: charges in this month that have already gone out. One
        // between today and the stored date was skipped (the date was set later on purpose).
        for (let n = -1; ; n -= 1) {
            const date = chargeDate(anchor, cadence, n);
            if (!date || date < monthStart || (startedAt && date < startedAt)) break;
            if (date < nextMonthStart && todayIsoDate(date) < today) add(date);
        }
    });

    return charges.sort((left, right) => left.date.localeCompare(right.date) || left.serviceName.localeCompare(right.serviceName));
};

/** Whole days from today (local time) to a YYYY-MM-DD date: 0 today, negative in the past. */
export const daysFromToday = (isoDate: string, now: Date = new Date()): number => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((parseDateOnly(isoDate).getTime() - today.getTime()) / 86_400_000);
};
