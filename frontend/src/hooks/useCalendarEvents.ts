import { useMemo } from 'react';
import { buildRecurringOccurrences } from '../utils/buildRecurringOccurrences';
import { mapSubscriptionToCalendarEvents } from '../utils/mapSubscriptionToCalendarEvents';
import { CalendarEvent } from '../types/calendar';
import { SubscriptionRecord } from '../types/subscription';

interface UseCalendarEventsInput {
    subscriptions: SubscriptionRecord[];
    rangeStart?: string;
    rangeEnd?: string;
}

const useCalendarEvents = ({
                               subscriptions,
                               rangeStart,
                               rangeEnd,
                           }: UseCalendarEventsInput): CalendarEvent[] => {
    return useMemo(() => {
        if (!rangeStart || !rangeEnd) return [];

        const occurrences = buildRecurringOccurrences({
            subscriptions,
            rangeStart,
            rangeEnd,
        });

        return mapSubscriptionToCalendarEvents(occurrences);
    }, [subscriptions, rangeStart, rangeEnd]);
};

export default useCalendarEvents;
