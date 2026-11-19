import type React from 'react';

/** The price one whole unit up or down, keeping the cents and never below zero. */
export const stepPrice = (amount: string, delta: 1 | -1): string => {
    const next = Math.max(0, Math.round(((Number(amount) || 0) + delta) * 100) / 100);
    return String(next);
};

/** The arrow keys step by a whole unit too. */
export const priceStepKeyDown = (value: string, onChange: (value: string) => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        onChange(stepPrice(value, event.key === 'ArrowUp' ? 1 : -1));
    }
};

export const hideNumberSpinners = {
    '& input[type=number]': { MozAppearance: 'textfield' },
    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
    },
};
