/**
 * The public subscription cost calculator (/calculator and the home page hero). Everything here
 * runs in the visitor's browser: nothing they type is sent to the server.
 */
import type { BillingInterval } from '../components/subscription-form/SubscriptionFormCard';
import type { Currency } from '../components/CurrencySelect';
import type { CatalogService } from '../data/services';
import { yearlyCostOf } from './reviewQueue';

export type CalculatorRow = {
    name: string;
    category: CatalogService['category'];
    /** As typed; an empty or invalid price counts as nothing. */
    amount: string;
    cadence: BillingInterval;
    /** Unticked rows are left out of the totals, to show what dropping them would free up. */
    included: boolean;
};

/** The currencies CurrencySelect offers. */
const CURRENCIES: Currency[] = ['EUR', 'USD', 'RON'];

export const CALCULATOR_CATEGORIES: CatalogService['category'][] = ['Entertainment', 'Software', 'Fitness', 'Banking', 'Utilities', 'Cloud', 'Other'];

export const CALCULATOR_CADENCES: { value: BillingInterval; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
];

/** Prices above this are treated as typos (a calculator, not a ledger). */
const MAX_PRICE = 100_000;

export const priceOf = (row: CalculatorRow): number => {
    const value = Number(row.amount);
    return Number.isFinite(value) && value > 0 && value <= MAX_PRICE ? value : 0;
};

export const yearlyOfRow = (row: CalculatorRow): number => yearlyCostOf(priceOf(row), row.cadence);

export type CategoryShare = { category: string; yearly: number; share: number };

export type CalculatorTotals = {
    /** Ticked rows with a price. */
    count: number;
    monthly: number;
    yearly: number;
    fiveYears: number;
    /** What the unticked rows with a price cost a year. */
    droppedYearly: number;
    droppedCount: number;
    /** Largest first. */
    categories: CategoryShare[];
};

export const calculatorTotals = (rows: CalculatorRow[]): CalculatorTotals => {
    const priced = rows.filter((row) => priceOf(row) > 0);
    const kept = priced.filter((row) => row.included);
    const dropped = priced.filter((row) => !row.included);
    const yearly = kept.reduce((sum, row) => sum + yearlyOfRow(row), 0);

    const byCategory = new Map<string, number>();
    kept.forEach((row) => byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + yearlyOfRow(row)));
    const categories = Array.from(byCategory.entries())
        .map(([category, total]) => ({ category, yearly: total, share: yearly > 0 ? total / yearly : 0 }))
        .sort((a, b) => b.yearly - a.yearly || a.category.localeCompare(b.category));

    return {
        count: kept.length,
        monthly: yearly / 12,
        yearly,
        // Five years at today's prices; no guess at future price rises.
        fiveYears: yearly * 5,
        droppedYearly: dropped.reduce((sum, row) => sum + yearlyOfRow(row), 0),
        droppedCount: dropped.length,
        categories,
    };
};

/**
 * A shared result travels in the URL fragment (#...), which browsers never send to a server.
 * It holds the totals only: never service names or prices.
 */
export type SharedResult = { yearly: number; count: number; currency: Currency; topCategory: string | null };

export const shareFragment = (result: SharedResult): string => {
    const params = new URLSearchParams({ y: result.yearly.toFixed(2), n: String(result.count), c: result.currency });
    if (result.topCategory) params.set('t', result.topCategory);
    return params.toString();
};

/** Reads a shared result from a URL fragment; anything malformed or out of range gives null. */
export const readSharedResult = (hash: string): SharedResult | null => {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const yearly = Number(params.get('y'));
    const count = Number(params.get('n'));
    const currency = params.get('c') as Currency | null;
    const topCategory = params.get('t');
    if (!params.has('y') || !Number.isFinite(yearly) || yearly <= 0 || yearly > MAX_PRICE * 52 * 100) return null;
    if (!Number.isInteger(count) || count < 1 || count > 500) return null;
    if (!currency || !CURRENCIES.includes(currency)) return null;
    if (topCategory !== null && !(CALCULATOR_CATEGORIES as string[]).includes(topCategory)) return null;

    return { yearly, count, currency, topCategory };
};

/**
 * Router state that carries the calculator's list to "Pick what you pay for" after sign-up or sign-in.
 * Router state lives in the browser's history entry only: no storage, nothing sent to the server.
 */
export type CalculatorImport = {
    currency: Currency;
    rows: Pick<CalculatorRow, 'name' | 'category' | 'amount' | 'cadence'>[];
};

export const calculatorImportOf = (state: unknown): CalculatorImport | null => {
    const value = (state as { calculatorImport?: CalculatorImport } | null)?.calculatorImport;
    if (!value || !CURRENCIES.includes(value.currency) || !Array.isArray(value.rows) || value.rows.length === 0) return null;

    return value;
};

/** The ticked rows with a price, ready to save. */
export const importFromRows = (rows: CalculatorRow[], currency: Currency): CalculatorImport => ({
    currency,
    rows: rows
        .filter((row) => row.included && priceOf(row) > 0)
        .map(({ name, category, amount, cadence }) => ({ name, category, amount: String(priceOf({ name, category, amount, cadence, included: true })), cadence })),
});
