import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Container, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { shareOf, splitCount } from '../utils/householdShare';
import {
    biggestUpcoming,
    categoryBreakdown,
    currenciesOf,
    monthlyEquivalentOf,
    monthlyForecast,
} from '../utils/insights';
import { formatCurrency } from '../utils/money';
import type { ChargeSource } from '../utils/monthCharges';
import './RecurringScreens.css';

type View = 'personal' | 'business';
type AmountMode = 'full' | 'share';

/** Shared with the dashboard: the Personal/Business view the user picked (see TODO #5's inventory). */
const VIEW_KEY = 'valutir_dashboard_view';

const readView = (): View => {
    try {
        return window.localStorage.getItem(VIEW_KEY) === 'business' ? 'business' : 'personal';
    } catch {
        return 'personal';
    }
};

const monthLabel = (yearMonth: string, style: 'short' | 'long' = 'short') => {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' })
        .format(new Date(year, month - 1, 1));
};

const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00`));

const InsightsPage: React.FC = () => {
    const { user } = useAuth();
    const { subscriptions, loading, error } = useSubscriptions();
    const [view, setView] = useState<View>(readView);
    const [amountMode, setAmountMode] = useState<AmountMode>('full');
    const [pickedCurrency, setPickedCurrency] = useState<string | null>(null);
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    // Fixed for the page's lifetime so the projections aren't recomputed on every render.
    const [now] = useState(() => new Date());

    const selectView = (next: View) => {
        setView(next);
        setOpenCategory(null);
        try {
            window.localStorage.setItem(VIEW_KEY, next);
        } catch {
            // Storage blocked: the choice lasts for this page only.
        }
    };

    const inView = useMemo(
        () => subscriptions.filter((subscription) =>
            subscription.status !== 'cancelled' && (view === 'business' ? subscription.b2b === true : subscription.b2b !== true)),
        [subscriptions, view]
    );
    const currencies = useMemo(() => currenciesOf(inView, user?.defaultCurrency), [inView, user?.defaultCurrency]);
    const currency = pickedCurrency && currencies.includes(pickedCurrency) ? pickedCurrency : (currencies[0] ?? user?.defaultCurrency ?? 'EUR');
    const inCurrency = useMemo(() => inView.filter((subscription) => (subscription.currency || 'EUR') === currency), [inView, currency]);

    const hasShared = view === 'personal' && inCurrency.some((subscription) => splitCount(subscription) > 1);
    const mode: AmountMode = hasShared ? amountMode : 'full';
    const amountFor = useCallback((subscription: ChargeSource) => {
        const amount = Number(subscription.amount) || 0;
        return mode === 'share' ? shareOf(amount, subscription) : amount;
    }, [mode]);
    const monthlyOf = useCallback(
        (subscription: ChargeSource) => monthlyEquivalentOf(amountFor(subscription), subscription.billingCadence),
        [amountFor]
    );

    const categories = useMemo(() => categoryBreakdown(inCurrency, amountFor), [inCurrency, amountFor]);
    const forecast = useMemo(() => monthlyForecast(inCurrency, amountFor, now), [inCurrency, amountFor, now]);
    const upcoming = useMemo(() => biggestUpcoming(inCurrency, amountFor, now), [inCurrency, amountFor, now]);
    const monthlyTotal = categories.reduce((sum, row) => sum + row.monthly, 0);
    // Moved here from the dashboard: what the user's own part of shared bills comes to.
    const sharedMonthlyShare = useMemo(
        () => inCurrency
            .filter((subscription) => splitCount(subscription) > 1)
            .reduce((sum, subscription) => sum + monthlyEquivalentOf(shareOf(Number(subscription.amount) || 0, subscription), subscription.billingCadence), 0),
        [inCurrency]
    );
    const mostExpensive = useMemo(
        () => [...inCurrency].sort((a, b) => monthlyOf(b) - monthlyOf(a))[0] ?? null,
        [inCurrency, monthlyOf]
    );
    const forecastMax = Math.max(...forecast.map((month) => month.total), 0);
    const forecastTotal = forecast.reduce((sum, month) => sum + month.total, 0);
    const money = (amount: number) => formatCurrency(amount, currency);

    return (
        <Box className="dashboard-page">
            <AppHeader />
            <Container className="dashboard-container insights-page">
                <Box className="dashboard-heading">
                    <div>
                        <h1>Insights</h1>
                        <p>Where your recurring money goes, and what the next 12 months will cost.</p>
                        <nav className="view-switch" aria-label="Subscription view">
                            <button type="button" aria-current={view === 'personal' ? 'page' : undefined} onClick={() => selectView('personal')}>Personal</button>
                            <button type="button" aria-current={view === 'business' ? 'page' : undefined} onClick={() => selectView('business')}>Business</button>
                        </nav>
                    </div>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                    <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress size={30} /></Box>
                ) : !error && inView.length === 0 ? (
                    <Paper className="dashboard-list">
                        <div className="empty-state">
                            <h2>Nothing to show yet</h2>
                            <p>{view === 'business'
                                ? 'Mark a subscription as Business to see business insights.'
                                : 'Add the subscriptions you pay for to see where the money goes.'}</p>
                        </div>
                    </Paper>
                ) : !error && (
                    <>
                        {(currencies.length > 1 || hasShared) && (
                            <Box className="insights-controls">
                                {currencies.length > 1 && (
                                    <ToggleButtonGroup
                                        size="small"
                                        exclusive
                                        value={currency}
                                        onChange={(_, next: string | null) => next && setPickedCurrency(next)}
                                        aria-label="Currency"
                                    >
                                        {currencies.map((code) => <ToggleButton key={code} value={code}>{code}</ToggleButton>)}
                                    </ToggleButtonGroup>
                                )}
                                {hasShared && (
                                    <ToggleButtonGroup
                                        size="small"
                                        exclusive
                                        value={amountMode}
                                        onChange={(_, next: AmountMode | null) => next && setAmountMode(next)}
                                        aria-label="Amounts shown"
                                    >
                                        <ToggleButton value="full">Full bills</ToggleButton>
                                        <ToggleButton value="share">My share</ToggleButton>
                                    </ToggleButtonGroup>
                                )}
                                {currencies.length > 1 && (
                                    <span>Showing {currency} subscriptions only. Amounts in different currencies aren’t converted.</span>
                                )}
                            </Box>
                        )}

                        <section className="metric-grid insights-totals" aria-label="Totals">
                            <Paper className="metric-card primary-metric">
                                <span className="metric-label">Per month</span>
                                <div className="metric-value" data-testid="insights-monthly">{money(monthlyTotal)}</div>
                                <div className="metric-hint">Average, with yearly and quarterly bills spread out</div>
                                {hasShared && (
                                    <div className="metric-hint" data-testid="insights-shared-share">
                                        Your share of shared bills: {money(sharedMonthlyShare)} / month
                                    </div>
                                )}
                            </Paper>
                            <Paper className="metric-card">
                                <span className="metric-label">Per year</span>
                                <div className="metric-value" data-testid="insights-yearly">{money(monthlyTotal * 12)}</div>
                                <div className="metric-hint">{inCurrency.length} active subscription{inCurrency.length === 1 ? '' : 's'}, trials included</div>
                            </Paper>
                            <Paper className="metric-card">
                                <span className="metric-label">Most expensive</span>
                                <div className="metric-value">{mostExpensive ? money(monthlyOf(mostExpensive)) : '—'} <small>/ month</small></div>
                                <div className="metric-hint">
                                    {mostExpensive
                                        ? <RouterLink to={`/subscriptions/${mostExpensive.id}`}>{mostExpensive.serviceName}</RouterLink>
                                        : 'No subscriptions'}
                                </div>
                            </Paper>
                        </section>

                        <Paper className="dashboard-list insights-section" component="section" aria-labelledby="insights-categories">
                            <div className="list-head">
                                <h2 id="insights-categories">By category</h2>
                                <span className="list-count">Monthly average · share of the total</span>
                            </div>
                            <ul className="category-bars">
                                {categories.map((row) => {
                                    const open = openCategory === row.category;
                                    const percent = Math.round(row.share * 100);
                                    return (
                                        <li key={row.category}>
                                            <button
                                                type="button"
                                                className="category-bar-row"
                                                aria-expanded={open}
                                                onClick={() => setOpenCategory(open ? null : row.category)}
                                            >
                                                <span className="category-bar-name">{row.category}</span>
                                                <span className="category-bar-track" aria-hidden="true">
                                                    <span className="category-bar-fill" style={{ width: `${Math.max(row.share * 100, 1)}%` }} />
                                                </span>
                                                <span className="category-bar-amount">{money(row.monthly)}</span>
                                                <span className="category-bar-share">{percent}%</span>
                                            </button>
                                            {open && (
                                                <ul className="category-members" aria-label={`${row.category} subscriptions`}>
                                                    {row.subscriptions.map((subscription) => (
                                                        <li key={subscription.id}>
                                                            <RouterLink to={`/subscriptions/${subscription.id}`}>{subscription.serviceName}</RouterLink>
                                                            <span>{money(amountFor(subscription))} / {subscription.billingCadence}</span>
                                                            <span>{money(monthlyOf(subscription))} / month</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </Paper>

                        <Paper className="dashboard-list insights-section" component="section" aria-labelledby="insights-forecast">
                            <div className="list-head">
                                <h2 id="insights-forecast">Next 12 months</h2>
                                <span className="list-count">{money(forecastTotal)} in total · estimated from billing dates</span>
                            </div>
                            <ol className="forecast-chart" aria-label="Charges per month">
                                {forecast.map((month, index) => (
                                    <li
                                        key={month.month}
                                        aria-label={`${monthLabel(month.month, 'long')}: ${money(month.total)}, ${month.count} charge${month.count === 1 ? '' : 's'}`}
                                    >
                                        <span className="forecast-value" aria-hidden="true">{month.total > 0 ? money(month.total) : ''}</span>
                                        <span className="forecast-bar-wrap" aria-hidden="true">
                                            <span
                                                className={`forecast-bar${month.total === forecastMax && forecastMax > 0 ? ' peak' : ''}`}
                                                style={{ height: `${forecastMax > 0 ? Math.max((month.total / forecastMax) * 100, month.total > 0 ? 2 : 0) : 0}%` }}
                                            />
                                        </span>
                                        <span className="forecast-month" aria-hidden="true">{index === 0 ? 'Now' : monthLabel(month.month)}</span>
                                    </li>
                                ))}
                            </ol>
                            <div className="list-labels"><span>The current month includes charges that have already gone out. The tallest bar is the most expensive month.</span></div>
                        </Paper>

                        <Paper className="dashboard-list insights-section" component="section" aria-labelledby="insights-upcoming">
                            <div className="list-head">
                                <h2 id="insights-upcoming">Biggest charges coming</h2>
                                <span className="list-count">Next 90 days</span>
                            </div>
                            {upcoming.length === 0 ? (
                                <div className="list-labels"><span>No charges in the next 90 days.</span></div>
                            ) : (
                                <ol className="month-charges insights-upcoming">
                                    {upcoming.map((charge) => (
                                        <li key={`${charge.subscriptionId}-${charge.date}`}>
                                            <span className="charge-date">{dayLabel(charge.date)}</span>
                                            <RouterLink className="charge-name" to={`/subscriptions/${charge.subscriptionId}`}>{charge.serviceName}</RouterLink>
                                            <span className="charge-amount">{money(charge.amount)}</span>
                                            <span className="charge-cadence">
                                                {charge.billingCadence === 'yearly' || charge.billingCadence === 'quarterly'
                                                    ? <span className="cadence-tag">{charge.billingCadence === 'yearly' ? 'Yearly' : 'Quarterly'}</span>
                                                    : null}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </Paper>
                    </>
                )}
            </Container>
            <AppFooter />
        </Box>
    );
};

export default InsightsPage;
