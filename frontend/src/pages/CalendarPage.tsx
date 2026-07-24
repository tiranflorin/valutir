import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Stack } from '@mui/material';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import SubscriptionCalendar from '../components/calendar/SubscriptionCalendar';
import CalendarDayDetails from '../components/calendar/CalendarDayDetails';
import { useAuth } from '../context/AuthContext';
import useCalendarEvents from '../hooks/useCalendarEvents';
import { VITE_API_URL } from '../services/auth';
import { SubscriptionRecord } from '../types/subscription';
import './CalendarPage.css';

const CalendarPage: React.FC = () => {
    const { token, logout } = useAuth();

    const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>();
    const [selectedEventId, setSelectedEventId] = useState<string>();
    const [visibleRange, setVisibleRange] = useState<{ start: string; end: string }>();

    useEffect(() => {
        const loadSubscriptions = async () => {
            if (!token) {
                setError('You are not authenticated.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');

                const response = await fetch(`${VITE_API_URL}/api/subs`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json().catch(() => null);

                if (response.status === 401) {
                    logout();
                    return;
                }

                if (!response.ok) {
                    throw new Error(data?.message || 'Failed to load subscriptions.');
                }

                setSubscriptions(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong.');
            } finally {
                setLoading(false);
            }
        };

        loadSubscriptions();
    }, [token, logout]);

    const calendarEvents = useCalendarEvents({
        subscriptions,
        rangeStart: visibleRange?.start,
        rangeEnd: visibleRange?.end,
    });

    const selectedDateEvents = useMemo(() => {
        if (!selectedDate) return [];
        return calendarEvents.filter((event) => event.start === selectedDate);
    }, [calendarEvents, selectedDate]);

    const handleDateClick = (date: string) => {
        setSelectedDate(date);

        const eventsForDate = calendarEvents.filter((event) => event.start === date);
        setSelectedEventId(eventsForDate[0]?.id);
    };

    const handleEventClick = (eventId: string) => {
        setSelectedEventId(eventId);

        const clicked = calendarEvents.find((event) => event.id === eventId);
        if (!clicked) return;

        if (clicked.start !== selectedDate) {
            setSelectedDate(clicked.start);
        }
    };

    return (
        <>
            <AppHeader title="Calendar" subtitle="Track renewals and upcoming billing dates." />

            <AppShell mode="content" maxWidth="lg">
                <Stack spacing={3} className="calendar-page">
                    {loading && (
                        <Box display="flex" justifyContent="center" py={8}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!loading && error && <Alert severity="error">{error}</Alert>}

                    {!loading && !error && (
                        <Box className="calendar-page__layout">
                            <Paper className="calendar-page__calendar-card" elevation={0}>
                                <SubscriptionCalendar
                                    events={calendarEvents}
                                    selectedDate={selectedDate}
                                    onDateClick={handleDateClick}
                                    onEventClick={handleEventClick}
                                    onDatesSet={setVisibleRange}
                                />
                            </Paper>

                            <Box className="calendar-page__side">
                                <CalendarDayDetails
                                    selectedDate={selectedDate}
                                    selectedEventId={selectedEventId}
                                    events={selectedDateEvents}
                                />
                            </Box>
                        </Box>
                    )}
                </Stack>
            </AppShell>
        </>
    );
};

export default CalendarPage;