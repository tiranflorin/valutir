/**
 * Reminder lead times, mirroring the backend's App\Reminder\ReminderPolicy (fixed for now;
 * custom lead times are a candidate paid-plan feature).
 */
export const TRIAL_REMINDER_LEAD_DAYS = 2;

export const renewalReminderLeadDays = (cadence: string): number => {
    switch (cadence) {
        case 'weekly':
            return 1;
        case 'monthly':
            return 3;
        default:
            return 7;
    }
};
