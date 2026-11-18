/** The price one whole unit up or down, keeping the cents and never below zero. */
export const stepPrice = (amount: string, delta: 1 | -1): string => {
    const next = Math.max(0, Math.round(((Number(amount) || 0) + delta) * 100) / 100);
    return String(next);
};
