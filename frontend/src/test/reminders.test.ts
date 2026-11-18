import { describe, expect, it } from 'vitest';
import { daysBeforeLabel, reminderLeadDays } from '../utils/reminders';

describe('reminder lead time', () => {
    it('uses the default for the cadence, or for a trial', () => {
        expect(reminderLeadDays(null, false, 'monthly', true)).toBe(3);
        expect(reminderLeadDays(null, false, 'yearly', true)).toBe(7);
        expect(reminderLeadDays(null, true, 'yearly', true)).toBe(2);
    });

    it('uses a chosen time only with paid features', () => {
        expect(reminderLeadDays(21, false, 'yearly', true)).toBe(21);
        expect(reminderLeadDays(21, false, 'yearly', false)).toBe(7);
    });

    it('reads as days before', () => {
        expect(daysBeforeLabel(1)).toBe('1 day before');
        expect(daysBeforeLabel(14)).toBe('14 days before');
    });
});
