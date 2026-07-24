export type CalendarStatus = 'upcoming' | 'dueSoon' | 'overdue' | 'renewed';

export interface CalendarEventExtendedProps {
    subscriptionId: string;
    amount: number;
    currency: string;
    ownerName?: string;
    status: CalendarStatus;
    category?: string | null;
    billingCadence?: string | null;
    paymentMethod?: string | null;
    notes?: string | null;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    allDay: boolean;
    extendedProps: CalendarEventExtendedProps;
}

export interface SubscriptionOccurrence {
    subscriptionId: string;
    title: string;
    date: string;
    amount: number;
    currency: string;
    ownerName?: string;
    category?: string | null;
    billingCadence?: string | null;
    paymentMethod?: string | null;
    notes?: string | null;
}
