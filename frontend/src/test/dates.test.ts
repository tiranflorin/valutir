import { describe, expect, it } from 'vitest';
import { isAfterToday, isBeforeToday, todayIsoDate } from '../utils/dates';

describe('date helpers', () => {
    it('uses the local calendar date, also just after midnight', () => {
        // 00:30 local time is still the previous day in UTC for zones east of UTC.
        expect(todayIsoDate(new Date(2026, 10, 2, 0, 30))).toBe('2026-11-02');
        expect(todayIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });

    it('compares dates by the local calendar day', () => {
        const now = new Date(2026, 10, 2, 9, 0);

        expect(isBeforeToday('2026-11-01', now)).toBe(true);
        expect(isBeforeToday('2026-11-02', now)).toBe(false);
        expect(isBeforeToday('2026-12-31', now)).toBe(false);
        expect(isAfterToday('2026-11-03', now)).toBe(true);
        expect(isAfterToday('2026-11-02', now)).toBe(false);
    });
});
