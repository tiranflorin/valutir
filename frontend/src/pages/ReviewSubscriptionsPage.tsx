import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, LinearProgress, Paper, Stack } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import { Link as RouterLink, useNavigate } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import SubscriptionCancelCard from '../components/subscription-detail/SubscriptionCancelCard';
import type { SubscriptionCardModel } from '../components/subscription-detail/SubscriptionHeaderCard';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../hooks/useSubscriptions';
import type { SubscriptionRecord } from '../types/subscription';
import { formatCurrency, groupedMoney } from '../utils/money';
import { reviewQueue, yearlyCostOf } from '../utils/reviewQueue';
import './RecurringScreens.css';

type Decision = 'kept' | 'cancelled' | 'skipped';

/** Shared with the dashboard and Insights: the Personal/Business view the user picked. */
const VIEW_KEY = 'valutir_dashboard_view';

const readView = (): 'personal' | 'business' => {
    try {
        return window.localStorage.getItem(VIEW_KEY) === 'business' ? 'business' : 'personal';
    } catch {
        return 'personal';
    }
};

const dayLabel = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso.slice(0, 10)}T00:00:00`)) : '—';

const cadenceLabel = (cadence: string) => cadence.charAt(0).toUpperCase() + cadence.slice(1).toLowerCase();

const cardModel = (subscription: SubscriptionRecord): SubscriptionCardModel => ({
    ...subscription,
    amount: Number(subscription.amount) || 0,
});

const yearlyOf = (subscription: SubscriptionRecord) => yearlyCostOf(Number(subscription.amount) || 0, subscription.billingCadence);

/**
 * "Review my subscriptions": one charged subscription at a time, Keep, Cancel or Skip, then what
 * cancelling saves a year. Cancel reuses the detail page's cancel step (same request); Keep clears
 * a review flag. Progress lives in this page only.
 */
const ReviewSubscriptionsPage: React.FC = () => {
    const navigate = useNavigate();
    const { token, logout } = useAuth();
    const { subscriptions, loading, error: loadError } = useSubscriptions();
    // Fixed when the list arrives, so a decision never reorders the cards still to come.
    const [queue, setQueue] = useState<SubscriptionRecord[] | null>(null);
    const [index, setIndex] = useState(0);
    const [decisions, setDecisions] = useState<Record<number, Decision>>({});
    const [cancelling, setCancelling] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (queue === null && !loading && !loadError) {
        const view = readView();
        setQueue(reviewQueue(subscriptions.filter((subscription) => (view === 'business') === (subscription.b2b === true))));
    }

    const current = queue && index < queue.length ? queue[index] : null;
    const finished = queue !== null && current === null;

    const signOut = useCallback(() => {
        logout();
        navigate('/login', { replace: true });
    }, [logout, navigate]);

    const decide = useCallback((subscription: SubscriptionRecord, decision: Decision) => {
        setDecisions((previous) => ({ ...previous, [subscription.id]: decision }));
        setCancelling(false);
        setError('');
        setIndex((previous) => previous + 1);
    }, []);

    const keep = useCallback(async (subscription: SubscriptionRecord) => {
        if (!subscription.reviewFlagged) {
            decide(subscription, 'kept');
            return;
        }
        // Keeping a flagged subscription answers the flag, so it's cleared.
        setSaving(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/subs/${subscription.id}/review`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.status === 401) {
                signOut();
                return;
            }
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || 'Could not clear the review flag.');
            }
            decide(subscription, 'kept');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    }, [decide, signOut, token]);

    // K or → keeps, C or ← cancels, S or ↓ skips. Never while typing or in the cancel step.
    useEffect(() => {
        if (!current || cancelling || saving) return undefined;
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            const key = event.key.toLowerCase();
            if (key === 'k' || key === 'arrowright') {
                event.preventDefault();
                void keep(current);
            } else if (key === 'c' || key === 'arrowleft') {
                event.preventDefault();
                setCancelling(true);
            } else if (key === 's' || key === 'arrowdown') {
                event.preventDefault();
                decide(current, 'skipped');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [current, cancelling, saving, keep, decide]);

    const decided = (decision: Decision) => (queue ?? []).filter((subscription) => decisions[subscription.id] === decision);
    const cancelled = decided('cancelled');

    return (
        <Box className="dashboard-page">
            <AppHeader />
            <Container className="dashboard-container keep-review-page">
                <Box className="dashboard-heading">
                    <div>
                        <h1>Review my subscriptions</h1>
                        <p>One at a time: keep what you use, cancel what you don’t. Nothing changes until you choose.</p>
                    </div>
                    <Box className="dashboard-heading-actions">
                        <Button component={RouterLink} to="/my-subs" variant="outlined" color="inherit">
                            {finished ? 'Back to dashboard' : 'Stop reviewing'}
                        </Button>
                    </Box>
                </Box>

                {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

                {loading || (queue === null && !loadError) ? (
                    <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress size={30} /></Box>
                ) : queue && queue.length === 0 ? (
                    <Paper className="dashboard-list">
                        <div className="empty-state">
                            <h2>Nothing to review</h2>
                            <p>Only active subscriptions and trials are reviewed, and there are none in this view.</p>
                        </div>
                    </Paper>
                ) : current && queue ? (
                    <>
                        <div className="keep-review-progress">
                            <span>{index + 1} of {queue.length}</span>
                            <LinearProgress
                                variant="determinate"
                                value={(index / queue.length) * 100}
                                aria-label={`Reviewed ${index} of ${queue.length}`}
                            />
                        </div>

                        {cancelling ? (
                            <SubscriptionCancelCard
                                key={current.id}
                                subscription={cardModel(current)}
                                token={token ?? ''}
                                onUnauthorized={signOut}
                                onCancelled={() => decide(current, 'cancelled')}
                                onKeepTracking={() => setCancelling(false)}
                            />
                        ) : (
                            <Paper className="keep-review-card" component="section" aria-labelledby="keep-review-name">
                                <div className="keep-review-tags">
                                    {current.status === 'trial' && <span className="status-tag trial">Trial ends {dayLabel(current.trialEndsAt || current.nextBillingDate)}</span>}
                                    {current.reviewFlagged && <span className="review-tag">Flagged for review</span>}
                                    {current.category && <span className="keep-review-category">{current.category}</span>}
                                </div>
                                <h2 id="keep-review-name">{current.serviceName}</h2>
                                {current.reviewFlagged && current.reviewNote && <p className="keep-review-note">“{current.reviewNote}”</p>}

                                <dl className="keep-review-facts">
                                    <div>
                                        <dt>Each charge</dt>
                                        <dd>{formatCurrency(Number(current.amount) || 0, current.currency)} · {cadenceLabel(current.billingCadence)}</dd>
                                    </div>
                                    <div>
                                        <dt>Per year</dt>
                                        <dd data-testid="keep-review-yearly">{formatCurrency(yearlyOf(current), current.currency)}</dd>
                                    </div>
                                    <div>
                                        <dt>Next charge</dt>
                                        <dd>{dayLabel(current.nextBillingDate)}</dd>
                                    </div>
                                    {current.householdShared && current.householdSize && (
                                        <div>
                                            <dt>Shared</dt>
                                            <dd>Split between {current.householdSize} people</dd>
                                        </div>
                                    )}
                                </dl>
                                {current.notes && <p className="keep-review-notes">{current.notes}</p>}

                                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} className="keep-review-actions">
                                    <Button variant="outlined" color="error" startIcon={<CancelOutlinedIcon />} disabled={saving} onClick={() => setCancelling(true)}>
                                        Cancel it
                                    </Button>
                                    <Button variant="text" color="inherit" startIcon={<SkipNextRoundedIcon />} disabled={saving} onClick={() => decide(current, 'skipped')}>
                                        Skip
                                    </Button>
                                    <Button variant="contained" startIcon={<CheckRoundedIcon />} disabled={saving} onClick={() => void keep(current)}>
                                        {saving ? 'Saving...' : 'Keep'}
                                    </Button>
                                </Stack>
                                <p className="keep-review-keys">Keys: <kbd>K</kbd> or <kbd>→</kbd> keep · <kbd>C</kbd> or <kbd>←</kbd> cancel · <kbd>S</kbd> or <kbd>↓</kbd> skip</p>
                            </Paper>
                        )}
                    </>
                ) : finished && queue ? (
                    <Paper className="keep-review-card keep-review-summary" component="section" aria-labelledby="keep-review-done">
                        <h2 id="keep-review-done">Review done</h2>
                        <ul className="keep-review-counts" aria-label="Review results">
                            <li><strong>{decided('kept').length}</strong> kept</li>
                            <li><strong>{cancelled.length}</strong> cancelled</li>
                            <li><strong>{decided('skipped').length}</strong> skipped</li>
                        </ul>
                        {cancelled.length > 0 ? (
                            <p className="keep-review-saving" data-testid="keep-review-saving">
                                You’ll save <strong>{groupedMoney(cancelled, yearlyOf)}</strong> a year.
                            </p>
                        ) : (
                            <p className="keep-review-saving">Everything you pay for stays. You can review again any time.</p>
                        )}
                        <Button component={RouterLink} to="/my-subs" variant="contained">Back to dashboard</Button>
                    </Paper>
                ) : null}
            </Container>
            <AppFooter />
        </Box>
    );
};

export default ReviewSubscriptionsPage;
