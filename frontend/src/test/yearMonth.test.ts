import { describe, expect, it } from 'vitest';
import { addMonths, quarterOf, yearMonthLabel } from '../utils/yearMonth';

describe('year-month helpers', () => {
    it('steps across years', () => {
        expect(addMonths('2026-01', -1)).toBe('2025-12');
        expect(addMonths('2026-12', 1)).toBe('2027-01');
    });

    it('names the month', () => {
        expect(yearMonthLabel('2026-11')).toBe('November 2026');
    });

    it('gives the quarter, ending at the current month while it runs', () => {
        expect(quarterOf('2026-08', '2026-11')).toEqual({ from: '2026-07', to: '2026-09', label: 'Q3 2026' });
        expect(quarterOf('2026-10', '2026-11')).toEqual({ from: '2026-10', to: '2026-11', label: 'Q4 2026' });
    });
});
