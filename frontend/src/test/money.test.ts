import { describe, expect, it } from 'vitest';
import { formatCurrency, groupedMoney, moneyByCurrency } from '../utils/money';

describe('formatCurrency', () => {
    it('puts a familiar symbol in front', () => {
        expect(formatCurrency(10.5, 'EUR')).toBe('€10.50');
        expect(formatCurrency(14.2, 'USD')).toBe('$14.20');
        expect(formatCurrency(1234.5, 'EUR')).toBe('€1,234.50');
    });

    it('puts the code after the amount for other currencies', () => {
        expect(formatCurrency(17.99, 'RON')).toBe('17.99 RON');
    });

    it('signs negative amounts before the symbol', () => {
        expect(formatCurrency(-5, 'EUR')).toBe('−€5.00');
    });
});

describe('totals per currency', () => {
    const items = [
        { currency: 'EUR', amount: 10 },
        { currency: 'RON', amount: 30 },
        { currency: 'EUR', amount: 2 },
        { currency: 'USD', amount: 5 },
    ];

    it('adds up each currency on its own, never converting', () => {
        expect(moneyByCurrency(items, (item) => item.amount)).toEqual(['€12.00', '30.00 RON', '$5.00']);
    });

    it('reads as a sentence', () => {
        expect(groupedMoney(items, (item) => item.amount)).toBe('€12.00, 30.00 RON and $5.00');
        expect(groupedMoney(items.slice(0, 2), (item) => item.amount)).toBe('€10.00 and 30.00 RON');
        expect(groupedMoney([], () => 0)).toBe('€0.00');
    });
});
