import { type ChargeSource, type MonthCharge, monthCharges } from './monthCharges';
import { todayIsoDate } from './dates';

/** What one bill costs per month on average: weekly × 52 / 12, quarterly / 3, yearly / 12. */
export const monthlyEquivalentOf = (amount: number, cadence: string): number => {
    switch (cadence.toLowerCase()) {
        case 'weekly': return amount * 52 / 12;
        case 'quarterly': return amount / 3;
        case 'yearly': return amount / 12;
        default: return amount; // monthly, and older cadences counted as they are
    }
};

/** The currencies in use, the preferred one first (when used), then alphabetically. */
export const currenciesOf = (subscriptions: ChargeSource[], preferred?: string | null): string[] => {
    const codes = Array.from(new Set(subscriptions.map((subscription) => subscription.currency || 'EUR')));
    return codes.sort((a, b) => (a === preferred ? -1 : b === preferred ? 1 : a.localeCompare(b)));
};

export const categoryName = (subscription: ChargeSource): string => subscription.category?.trim() || 'Uncategorized';

export type CategoryTotal = {
    category: string;
    /** Monthly equivalent of the category's subscriptions. */
    monthly: number;
    /** Part of the total monthly equivalent, 0 to 1. */
    share: number;
    subscriptions: ChargeSource[];
};

/**
 * Monthly cost per category, largest first. Pass subscriptions in one currency: amounts in
 * different currencies are never added together.
 */
export const categoryBreakdown = (
    subscriptions: ChargeSource[],
    amountFor: (subscription: ChargeSource) => number,
): CategoryTotal[] => {
    const byCategory = new Map<string, ChargeSource[]>();
    subscriptions.forEach((subscription) => {
        const name = categoryName(subscription);
        byCategory.set(name, [...(byCategory.get(name) ?? []), subscription]);
    });
    const monthlyOf = (subscription: ChargeSource) => monthlyEquivalentOf(amountFor(subscription), subscription.billingCadence);
    const rows = Array.from(byCategory.entries()).map(([category, items]) => ({
        category,
        monthly: items.reduce((sum, subscription) => sum + monthlyOf(subscription), 0),
        subscriptions: [...items].sort((a, b) => monthlyOf(b) - monthlyOf(a)),
    }));
    const total = rows.reduce((sum, row) => sum + row.monthly, 0);

    return rows
        .map((row) => ({ ...row, share: total > 0 ? row.monthly / total : 0 }))
        .sort((a, b) => b.monthly - a.monthly || a.category.localeCompare(b.category));
};

export type MonthTotal = {
    /** YYYY-MM. */
    month: string;
    total: number;
    count: number;
};

/**
 * Charges per calendar month, from the current month (including charges already gone out) through
 * the next `months - 1`. Same counting as the dashboard's "This month" card. One currency at a time.
 */
export const monthlyForecast = (
    subscriptions: ChargeSource[],
    amountFor: (subscription: ChargeSource) => number,
    now: Date = new Date(),
    months = 12,
): MonthTotal[] => Array.from({ length: months }, (_, offset) => {
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const charges = monthCharges(subscriptions, amountFor, now, month);
    return {
        month: todayIsoDate(month).slice(0, 7),
        total: charges.reduce((sum, charge) => sum + charge.amount, 0),
        count: charges.length,
    };
});

/** The largest charges still to come from today through `days` ahead, biggest first. */
export const biggestUpcoming = (
    subscriptions: ChargeSource[],
    amountFor: (subscription: ChargeSource) => number,
    now: Date = new Date(),
    days = 90,
    limit = 5,
): MonthCharge[] => {
    const today = todayIsoDate(now);
    const last = todayIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
    const monthsSpanned = Math.ceil(days / 28) + 1;
    const charges: MonthCharge[] = [];
    for (let offset = 0; offset < monthsSpanned; offset += 1) {
        const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        charges.push(...monthCharges(subscriptions, amountFor, now, month)
            .filter((charge) => charge.date >= today && charge.date <= last));
    }

    return charges
        .sort((a, b) => b.amount - a.amount || a.date.localeCompare(b.date))
        .slice(0, limit);
};
