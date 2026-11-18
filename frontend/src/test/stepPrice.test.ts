import { describe, expect, it } from 'vitest';
import { stepPrice } from '../utils/stepPrice';

describe('stepPrice', () => {
    it('moves by a whole unit and keeps the cents', () => {
        expect(stepPrice('15.99', 1)).toBe('16.99');
        expect(stepPrice('15.99', -1)).toBe('14.99');
        expect(stepPrice('0.1', 1)).toBe('1.1');
    });

    it('starts from zero when the field is empty', () => {
        expect(stepPrice('', 1)).toBe('1');
    });

    it('never goes below zero', () => {
        expect(stepPrice('0.50', -1)).toBe('0');
        expect(stepPrice('', -1)).toBe('0');
    });
});
