import React, { useMemo } from 'react';
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { CalendarEvent } from '../../types/calendar';

interface CalendarDayDetailsProps {
    selectedDate?: string;
    selectedEventId?: string;
    events: CalendarEvent[];
}

const CalendarDayDetails: React.FC<CalendarDayDetailsProps> = ({
                                                                   selectedDate,
                                                                   selectedEventId,
                                                                   events,
                                                               }) => {
    const sortedEvents = useMemo(() => {
        if (!selectedEventId) return events;

        return [...events].sort((a, b) => {
            if (a.id === selectedEventId) return -1;
            if (b.id === selectedEventId) return 1;
            return 0;
        });
    }, [events, selectedEventId]);

    const titleText = selectedDate || 'Select a date';

    return (
        <Paper className="calendar-page__details-card" elevation={0}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="overline" color="text.secondary">
                        Selected date
                    </Typography>

                    <Typography
                        variant="h6"
                        fontWeight={800}
                        className={
                            selectedDate
                                ? 'calendar-day-details__title calendar-day-details__title--active'
                                : 'calendar-day-details__title'
                        }
                    >
                        {titleText}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {selectedDate
                            ? `${events.length} subscription${events.length === 1 ? '' : 's'} due`
                            : 'Click a date to inspect subscriptions due that day.'}
                    </Typography>
                </Box>

                {events.length > 0 && (
                    <>
                        <Stack spacing={0} divider={<Divider flexItem />}>
                            {sortedEvents.slice(0, 6).map((event) => {
                                const props = event.extendedProps;

                                return (
                                    <Stack
                                        key={event.id}
                                        className="calendar-day-details__preview-row"
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        gap={1.5}
                                    >
                                        <Box minWidth={0}>
                                            <Typography variant="body2" fontWeight={750} noWrap>{event.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {props.billingCadence || 'Recurring'}{props.category ? ` · ${props.category}` : ''}
                                            </Typography>
                                        </Box>
                                        <Stack alignItems="flex-end" spacing={0.5} flexShrink={0}>
                                            <Typography variant="body2" fontWeight={700}>{props.amount} {props.currency}</Typography>
                                            <Chip size="small" label={props.status} className={`calendar-status-chip calendar-status-chip--${props.status}`} />
                                        </Stack>
                                    </Stack>
                                );
                            })}
                        </Stack>
                        {events.length > 6 && (
                            <Typography variant="caption" color="text.secondary" className="calendar-day-details__more">
                                +{events.length - 6} more renewal{events.length - 6 === 1 ? '' : 's'}
                            </Typography>
                        )}
                        <Button
                            className="calendar-day-details__open-day"
                            component={RouterLink}
                            to={`/calendar/day/${selectedDate}`}
                            variant="outlined"
                            fullWidth
                        >
                            Open day schedule
                        </Button>
                    </>
                )}
            </Stack>
        </Paper>
    );
};

export default CalendarDayDetails;
