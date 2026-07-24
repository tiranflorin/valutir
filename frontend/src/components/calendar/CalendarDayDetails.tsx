import React, { useMemo } from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { CalendarEvent } from '../../types/calendar';

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

                <Stack spacing={1.5}>
                    {sortedEvents.map((event) => {
                        const props = event.extendedProps;
                        const isSelected = event.id === selectedEventId;

                        return (
                            <Box
                                key={event.id}
                                className={`calendar-day-details__item${isSelected ? ' calendar-day-details__item--selected' : ''}`}
                            >
                                <Stack spacing={1.25}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                                        <Typography variant="subtitle1" fontWeight={800}>
                                            {event.title}
                                        </Typography>

                                        <Chip
                                            size="small"
                                            label={props.status}
                                            className={`calendar-status-chip calendar-status-chip--${props.status}`}
                                        />
                                    </Stack>

                                    <Typography variant="body2" color="text.secondary">
                                        {props.amount} {props.currency}
                                    </Typography>

                                    {props.category && (
                                        <Typography variant="body2" color="text.secondary">
                                            Category: {props.category}
                                        </Typography>
                                    )}

                                    {props.billingCadence && (
                                        <Typography variant="body2" color="text.secondary">
                                            Cadence: {props.billingCadence}
                                        </Typography>
                                    )}

                                    {props.paymentMethod && (
                                        <Typography variant="body2" color="text.secondary">
                                            Payment: {props.paymentMethod}
                                        </Typography>
                                    )}

                                    {props.notes && (
                                        <Typography variant="body2" color="text.secondary">
                                            Notes: {props.notes}
                                        </Typography>
                                    )}

                                    <Box pt={0.5}>
                                        <Button
                                            component={RouterLink}
                                            to={`/subscriptions/${props.subscriptionId}`}
                                            size="small"
                                            variant={isSelected ? 'contained' : 'outlined'}
                                        >
                                            Open subscription
                                        </Button>
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            </Stack>
        </Paper>
    );
};

export default CalendarDayDetails;