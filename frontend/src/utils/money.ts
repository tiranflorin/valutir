/** One amount in its own currency, e.g. "€9.99". Falls back to "9.99 XYZ" for a code Intl doesn't know. */
export const formatCurrency = (amount: number, currency: string): string => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'EUR' }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency || 'EUR'}`;
    }
};

/**
 * The sum of `valueFor` over the items, kept per currency and never converted: "€12.00 + $5.00".
 * An empty list gives "€0.00".
 */
export const groupedMoney = <T extends { currency: string }>(items: T[], valueFor: (item: T) => number): string => {
    const totals = new Map<string, number>();
    items.forEach((item) => {
        const currency = item.currency || 'EUR';
        totals.set(currency, (totals.get(currency) || 0) + valueFor(item));
    });
    if (!totals.size) return formatCurrency(0, 'EUR');
    return Array.from(totals.entries()).map(([currency, total]) => formatCurrency(total, currency)).join(' + ');
};
