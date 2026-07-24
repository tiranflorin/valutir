export type CalendarStatus = 'upcoming' | 'dueSoon' | 'overdue' | 'renewed';

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    allDay: boolean;
    extendedProps: {
        subscriptionId: string;
        amount: number;
        currency: string;
        ownerName?: string;
        status: CalendarStatus;
    };
}

export interface SubscriptionOccurrence {
    subscriptionId: string;
    title: string;
    date: string;
    amount: number;
    currency: string;
    ownerName?: string;
}
