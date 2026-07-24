import {
    CalendarEvent,
    CalendarStatus,
    SubscriptionOccurrence,
} from '../types/calendar';

const differenceInDays = (targetDate: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(`${targetDate}T00:00:00`);
    const diffMs = target.getTime() - today.getTime();

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const getStatus = (date: string): CalendarStatus => {
    const days = differenceInDays(date);

    if (days < 0) return 'overdue';
    if (days <= 3) return 'dueSoon';
    return 'upcoming';
};

export const mapSubscriptionToCalendarEvents = (
    occurrences: SubscriptionOccurrence[]
): CalendarEvent[] =>
    occurrences.map((occurrence) => ({
        id: `${occurrence.subscriptionId}-${occurrence.date}`,
        title: occurrence.title,
        start: occurrence.date,
        allDay: true,
        extendedProps: {
            subscriptionId: occurrence.subscriptionId,
            amount: occurrence.amount,
            currency: occurrence.currency,
            ownerName: occurrence.ownerName,
            status: getStatus(occurrence.date),
        },
    }));
