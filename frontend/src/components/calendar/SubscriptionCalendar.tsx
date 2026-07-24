import React, { useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import CalendarToolbar from './CalendarToolbar';
import { CalendarEvent } from '../../types/calendar';

interface SubscriptionCalendarProps {
    events: CalendarEvent[];
    onDateClick?: (date: string) => void;
    onEventClick?: (eventId: string) => void;
    onDatesSet?: (range: { start: string; end: string }) => void;
}

const SubscriptionCalendar: React.FC<SubscriptionCalendarProps> = ({
                                                                       events,
                                                                       onDateClick,
                                                                       onEventClick,
                                                                       onDatesSet,
                                                                   }) => {
    const calendarRef = useRef<FullCalendar | null>(null);
    const [title, setTitle] = useState('Calendar');

    const calendarApi = useMemo(
        () => () => calendarRef.current?.getApi(),
        []
    );

    return (
        <div className="calendar-shell">
            <CalendarToolbar
                title={title}
                onPrev={() => calendarApi()?.prev()}
                onToday={() => calendarApi()?.today()}
                onNext={() => calendarApi()?.next()}
            />

            <div className="calendar-shell__body">
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
                        setTitle(arg.view.title);
                        onDatesSet?.({
                            start: arg.startStr,
                            end: arg.endStr,
                        });
                    }}
                />
            </div>
        </div>
    );
};

export default SubscriptionCalendar;
