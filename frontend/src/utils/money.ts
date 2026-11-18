/** Currencies written with their symbol in front, as customers see them on price tags: "€9.99", "$14.20". */
const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };

/** Just the number, two decimals and thousands separators, e.g. "1,234.50"; the currency goes next to it. */
export const formatAmount = (amount: number): string =>
    new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

/**
 * One amount in its own currency: the symbol first where there is a familiar one ("€9.99", "$14.20"),
 * otherwise the code after the amount ("17.99 RON").
 */
export const formatCurrency = (amount: number, currency: string): string => {
    const code = currency || 'EUR';
    const sign = amount < 0 ? '−' : '';
    const digits = formatAmount(Math.abs(amount));
    return code in SYMBOLS ? `${sign}${SYMBOLS[code]}${digits}` : `${sign}${digits} ${code}`;
};

/** The sum of `valueFor` over the items per currency, never converted: one formatted total per currency, in first-seen order. */
export const moneyByCurrency = <T extends { currency: string }>(items: T[], valueFor: (item: T) => number): string[] => {
    const totals = new Map<string, number>();
    items.forEach((item) => {
        const currency = item.currency || 'EUR';
        totals.set(currency, (totals.get(currency) || 0) + valueFor(item));
    });
    return Array.from(totals.entries()).map(([currency, total]) => formatCurrency(total, currency));
};

/**
 * The per-currency totals for use in a sentence: "€12.00", "€12.00 and $5.00", "€12.00, $5.00 and 30.00 RON".
 * An empty list gives "€0.00".
 */
export const groupedMoney = <T extends { currency: string }>(items: T[], valueFor: (item: T) => number): string => {
    const totals = moneyByCurrency(items, valueFor);
    if (!totals.length) return formatCurrency(0, 'EUR');
    return totals.length === 1 ? totals[0] : `${totals.slice(0, -1).join(', ')} and ${totals[totals.length - 1]}`;
};
