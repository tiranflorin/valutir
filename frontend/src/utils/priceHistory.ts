import type { PriceChange, SubscriptionRecord } from '../types/subscription';
import { yearlyCostOf } from './insights';
import { formatCurrency } from './money';

const CADENCE_WORDS: Record<string, string> = { weekly: 'a week', monthly: 'a month', quarterly: 'a quarter', yearly: 'a year' };

/** "€13.99 a month". */
export const priceLabel = (amount: string | number, currency: string, cadence: string): string =>
    `${formatCurrency(Number(amount) || 0, currency)} ${CADENCE_WORDS[cadence] ?? cadence}`;

/**
 * What the change adds to a year of charges (negative when it got cheaper), in the change's currency.
 * Null when the currency changed: amounts in two currencies are never compared.
 */
export const yearlyDifference = (change: PriceChange): number | null =>
    change.previousCurrency === change.newCurrency
        ? yearlyCostOf(Number(change.newAmount) || 0, change.newCadence) - yearlyCostOf(Number(change.previousAmount) || 0, change.previousCadence)
        : null;

/** "+€24.00 a year" or "−€12.00 a year". */
export const differenceLabel = (difference: number, currency: string): string =>
    `${difference >= 0 ? '+' : '−'}${formatCurrency(Math.abs(difference), currency)} a year`;

/** Whether the change was made within the year up to `today` (YYYY-MM-DD). */
export const withinLastYear = (change: PriceChange, today: string): boolean => {
    const [year, month, day] = today.split('-').map(Number);
    const yearAgo = `${year - 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return change.changedOn > yearAgo && change.changedOn <= today;
};

export type RecentPriceChange = {
    subscription: SubscriptionRecord;
    change: PriceChange;
    /** What it adds to a year, scaled as the page shows amounts (the full bill, or the user's share). */
    yearly: number;
};

/**
 * Insights' list: changes made within the year up to `today`, in `currency` (a change between two
 * currencies has no difference to show, so it's left out), newest first.
 */
export const recentPriceChanges = (
    subscriptions: SubscriptionRecord[],
    currency: string,
    today: string,
    scale: (subscription: SubscriptionRecord) => number = () => 1,
): RecentPriceChange[] => subscriptions
    .flatMap((subscription) => (subscription.priceChanges ?? []).flatMap((change) => {
        const difference = yearlyDifference(change);
        return difference !== null && change.newCurrency === currency && withinLastYear(change, today)
            ? [{ subscription, change, yearly: difference * scale(subscription) }]
            : [];
    }))
    .sort((a, b) => b.change.changedOn.localeCompare(a.change.changedOn) || b.change.id - a.change.id);
