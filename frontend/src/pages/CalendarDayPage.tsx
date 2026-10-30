import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import AppShell from '../components/AppShell';
import CalendarFiltersBar from '../components/calendar/CalendarFiltersBar';
import type { CalendarFilters } from '../components/calendar/CalendarFiltersBar';
import { useAuth } from '../context/AuthContext';
import useCalendarEvents from '../hooks/useCalendarEvents';
import { VITE_API_URL } from '../services/auth';
import type { SubscriptionRecord } from '../types/subscription';
import './CalendarPage.css';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const nextDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

const CalendarDayPage: React.FC = () => {
    const { date = '' } = useParams<{ date: string }>();
    const { token, logout } = useAuth();
    const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState<CalendarFilters>({
        status: 'all', category: 'all', billingCadence: 'all', activeOnly: false,
    });
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    const validDate = isoDatePattern.test(date)
        && parsedDate.getUTCFullYear() === year
        && parsedDate.getUTCMonth() === month - 1
        && parsedDate.getUTCDate() === day;

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
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                });
                const data = await response.json().catch(() => null);
                if (response.status === 401) {
                    logout();
                    return;
                }
                if (!response.ok) throw new Error(data?.message || 'Failed to load subscriptions.');
                setSubscriptions(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong.');
            } finally {
                setLoading(false);
            }
        };
        loadSubscriptions();
    }, [token, logout]);

    const categories = useMemo(() => Array.from(new Set(
        subscriptions.map((subscription) => subscription.category).filter((category): category is string => Boolean(category)),
    )).sort(), [subscriptions]);

    const filteredSubscriptions = useMemo(() => subscriptions.filter((subscription) => {
        if (filters.status !== 'all' && subscription.status !== filters.status) return false;
        if (filters.category !== 'all' && subscription.category !== filters.category) return false;
        if (filters.billingCadence !== 'all' && subscription.billingCadence !== filters.billingCadence) return false;
        if (filters.activeOnly && !subscription.isActive) return false;
        return true;
    }), [subscriptions, filters]);

    const events = useCalendarEvents({
        subscriptions: filteredSubscriptions,
        rangeStart: validDate ? date : undefined,
        rangeEnd: validDate ? nextDate(date) : undefined,
    });
    const currencyTotals = useMemo(() => events.reduce<Record<string, number>>((totals, event) => {
        totals[event.extendedProps.currency] = (totals[event.extendedProps.currency] || 0) + event.extendedProps.amount;
        return totals;
    }, {}), [events]);

    if (!validDate) {
        return <Navigate to="/calendar" replace />;
    }

    return (
        <>
            <AppHeader />
            <AppShell mode="content" maxWidth="lg">
                <Stack spacing={3} className="calendar-page calendar-day-page">
                    <Box className="calendar-page__heading calendar-day-page__heading">
                        <Box>
                            <Typography variant="h4" component="h1">
                                {loading ? 'Payments scheduled' : events.length ? `${events.length} subscription${events.length === 1 ? '' : 's'} due` : 'No subscriptions due'}
                            </Typography>
                            <Typography color="text.secondary">
                                <strong>{formatDate(date)} </strong> · Select a service to open its details. Amounts stay in their original currencies.
                            </Typography>
                        </Box>
                        <Button
                            component={RouterLink}
                            to={`/calendar?date=${date}`}
                            variant="outlined"
                            startIcon={<ArrowBackRoundedIcon />}
                        >
                            Back to calendar
                        </Button>
                    </Box>

                    <Paper className="calendar-page__calendar-card calendar-day-page__card" elevation={0}>
                        <CalendarFiltersBar filters={filters} categories={categories} onChange={setFilters} />
                        {loading && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}
                        {!loading && error && <Alert severity="error">{error}</Alert>}
                        {!loading && !error && (
                            <Box className="calendar-day-page__content">
                                <Box className="calendar-day-page__list">
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} className="calendar-day-page__list-heading">
                                        <Typography variant="h6" component="h2">Payments scheduled</Typography>
                                        <Typography color="text.secondary" fontWeight={700}>
                                            {Object.entries(currencyTotals).map(([currency, total]) => `${currency} ${total.toFixed(2)}`).join(' · ') || 'No payments'}
                                        </Typography>
                                    </Stack>
                                    {events.length === 0 ? (
                                        <Box className="calendar-day-page__empty">
                                            <Typography fontWeight={700}>Nothing is scheduled for this date.</Typography>
                                            <Typography color="text.secondary">Try another calendar date or adjust the filters.</Typography>
                                        </Box>
                                    ) : events.map((event) => {
                                        const props = event.extendedProps;
                                        return (
                                            <Box key={event.id} className="calendar-day-page__item">
                                                <Box className="calendar-day-page__service-icon" aria-hidden="true">{event.title.slice(0, 1).toUpperCase()}</Box>
                                                <Box className="calendar-day-page__service-copy">
                                                    <Typography fontWeight={800}>{event.title}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {props.amount} {props.currency}{props.billingCadence ? ` · ${props.billingCadence}` : ''}{props.category ? ` · ${props.category}` : ''}
                                                    </Typography>
                                                </Box>
                                                <Chip size="small" label={props.status} className={`calendar-status-chip calendar-status-chip--${props.status}`} />
                                                <Button component={RouterLink} to={`/subscriptions/${props.subscriptionId}`} variant="outlined" size="small">Open</Button>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}
                    </Paper>
                </Stack>
            </AppShell>
            <AppFooter />
        </>
    );
};

export default CalendarDayPage;
