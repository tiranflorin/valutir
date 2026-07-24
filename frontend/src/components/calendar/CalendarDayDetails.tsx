import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { CalendarEvent } from '../../types/calendar';

interface CalendarDayDetailsProps {
    selectedDate?: string;
    events: CalendarEvent[];
}

const CalendarDayDetails: React.FC<CalendarDayDetailsProps> = ({
                                                                   selectedDate,
                                                                   events,
                                                               }) => {
    return (
        <Paper className="calendar-page__card" elevation={0}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="overline" color="text.secondary">
                        Selected date
                    </Typography>

                    <Typography variant="h6" fontWeight={800}>
                        {selectedDate || 'Select a date'}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {selectedDate
                            ? `${events.length} subscription${events.length === 1 ? '' : 's'} due`
                            : 'Click a date to inspect subscriptions due that day.'}
                    </Typography>
                </Box>

                {selectedDate && events.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        No subscriptions due on this date.
                    </Typography>
                )}

                <Stack spacing={1.5}>
                    {events.map((event) => (
                        <Box key={event.id} className="calendar-day-details__item">
                            <Stack spacing={1}>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    gap={1}
                                >
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {event.title}
                                    </Typography>

                                    <Chip
                                        size="small"
                                        label={event.extendedProps.status}
                                        className={`calendar-status-chip calendar-status-chip--${event.extendedProps.status}`}
                                    />
                                </Stack>

                                <Typography variant="body2" color="text.secondary">
                                    {event.extendedProps.amount} {event.extendedProps.currency}
                                </Typography>

                                {event.extendedProps.ownerName && (
                                    <Typography variant="body2" color="text.secondary">
                                        Owner: {event.extendedProps.ownerName}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </Stack>
        </Paper>
    );
};

export default CalendarDayDetails;