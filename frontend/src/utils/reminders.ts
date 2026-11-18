/**
 * Reminder lead times, mirroring the backend's App\Reminder\ReminderPolicy: a default per cadence
 * (and for trials), or the subscription's own choice when the owner has paid features.
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

/** The choices offered in the form (the API takes any whole number from 1 to 30). */
export const REMINDER_LEAD_DAY_CHOICES = [1, 2, 3, 5, 7, 10, 14, 21, 30];

export const defaultReminderLeadDays = (trial: boolean, cadence: string): number =>
    trial ? TRIAL_REMINDER_LEAD_DAYS : renewalReminderLeadDays(cadence);

/** Days before the charge the reminder goes out; a chosen time only counts with paid features. */
export const reminderLeadDays = (chosen: number | null, trial: boolean, cadence: string, paidFeatures: boolean): number =>
    paidFeatures && chosen !== null ? chosen : defaultReminderLeadDays(trial, cadence);

export const daysBeforeLabel = (days: number): string => (days === 1 ? '1 day before' : `${days} days before`);
