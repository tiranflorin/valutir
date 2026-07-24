import React, { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarEvent } from '../../types/calendar';
import CalendarToolbar from './CalendarToolbar';

interface SubscriptionCalendarProps {
    events: CalendarEvent[];
    selectedDate?: string;
    onDateClick?: (date: string) => void;
    onEventClick?: (eventId: string) => void;
    onDatesSet?: (range: { start: string; end: string }) => void;
}

const SubscriptionCalendar: React.FC<SubscriptionCalendarProps> = ({
                                                                       events,
                                                                       selectedDate,
                                                                       onDateClick,
                                                                       onEventClick,
                                                                       onDatesSet,
                                                                   }) => {
    const calendarRef = useRef<FullCalendar | null>(null);

    const toLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };


    return (
        <div className="calendar-shell">
            <CalendarToolbar
                onPrev={() => calendarRef.current?.getApi().prev()}
                onToday={() => calendarRef.current?.getApi().today()}
                onNext={() => calendarRef.current?.getApi().next()}
            />

            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                height="auto"
                fixedWeekCount={false}
                showNonCurrentDates={false}
                dayMaxEventRows={3}
                events={events}
                dateClick={(arg) => onDateClick?.(arg.dateStr)}
                eventClick={(arg) => onEventClick?.(arg.event.id)}
                datesSet={(arg) => {
                    onDatesSet?.({
                        start: arg.startStr,
                        end: arg.endStr,
                    });
                }}
                dayCellClassNames={(arg) => {
                    const dateStr = toLocalDateString(arg.date);

                    return selectedDate === dateStr ? ['calendar-day--selected'] : [];
                }}
            />
        </div>
    );
};

export default SubscriptionCalendar;
