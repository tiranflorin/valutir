import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, LinearProgress, Paper, Stack } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Link as RouterLink, useNavigate } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import SubscriptionCancelCard from '../components/subscription-detail/SubscriptionCancelCard';
import type { SubscriptionCardModel } from '../types/subscription';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../hooks/useSubscriptions';
import type { SubscriptionRecord } from '../types/subscription';
import ManageLinkNote from '../components/ManageLinkNote';
import { safeManageUrl } from '../utils/manageUrl';
import { formatCurrency, groupedMoney } from '../utils/money';
import { findOverlaps, overlapReasons } from '../utils/overlaps';
import { differenceLabel, priceLabel, recentRise } from '../utils/priceHistory';
import { todayIsoDate } from '../utils/dates';
import { reviewQueue, yearlyCostOf } from '../utils/reviewQueue';
import { readDashboardView } from '../utils/dashboardView';

type Decision = 'kept' | 'cancelled' | 'skipped';

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
    // Review flags already cleared here: keeping the same card again after going back sends nothing.
    const [flagsCleared, setFlagsCleared] = useState<Set<number>>(() => new Set());

    if (queue === null && !loading && !loadError) {
        const view = readDashboardView();
        setQueue(reviewQueue(subscriptions.filter((subscription) => (view === 'business') === (subscription.b2b === true))));
    }

    // Why a subscription may be paying for something twice, from the same frozen list.
    const overlapReason = useMemo(() => overlapReasons(findOverlaps(queue ?? [])), [queue]);
    const current = queue && index < queue.length ? queue[index] : null;
    // A price rise the user recorded in the last year: easy to forget by the time they decide.
    const rise = current ? recentRise(current, todayIsoDate()) : null;
    const finished = queue !== null && current === null;
    const currentDecision = current ? decisions[current.id] : undefined;

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

    /** Moves between cards without deciding; the summary is one step past the last card. */
    const goTo = useCallback((next: number) => {
        if (!queue) return;
        setCancelling(false);
        setError('');
        setIndex(Math.max(0, Math.min(next, queue.length)));
    }, [queue]);

    /** Next card: an undecided one you move past counts as skipped. */
    const next = useCallback(() => {
        if (current && !decisions[current.id]) {
            decide(current, 'skipped');
        } else {
            goTo(index + 1);
        }
    }, [current, decisions, decide, goTo, index]);

    const keep = useCallback(async (subscription: SubscriptionRecord) => {
        if (!subscription.reviewFlagged || flagsCleared.has(subscription.id)) {
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
            setFlagsCleared((previous) => new Set(previous).add(subscription.id));
            decide(subscription, 'kept');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    }, [decide, signOut, token, flagsCleared]);

    // Letters decide (K keep, C cancel, S skip), arrows move (← previous, → next). A cancelled card
    // can't be decided again here. Never while typing or in the cancel step.
    useEffect(() => {
        if (queue === null || queue.length === 0 || cancelling || saving) return undefined;
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            const key = event.key.toLowerCase();
            if (key === 'arrowleft' && index > 0) {
                event.preventDefault();
                goTo(index - 1);
            } else if (key === 'arrowright' && current) {
                event.preventDefault();
                next();
            } else if (current && currentDecision !== 'cancelled') {
                if (key === 'k') {
                    event.preventDefault();
                    void keep(current);
                } else if (key === 'c') {
                    event.preventDefault();
                    setCancelling(true);
                } else if (key === 's') {
                    event.preventDefault();
                    decide(current, 'skipped');
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [queue, index, current, currentDecision, cancelling, saving, keep, decide, goTo, next]);

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
                            <Button
                                variant="text"
                                color="inherit"
                                size="small"
                                startIcon={<ArrowBackRoundedIcon />}
                                disabled={index === 0 || saving}
                                onClick={() => goTo(index - 1)}
                            >
                                Back
                            </Button>
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
                                    {overlapReason.has(current.id) && <span className="review-tag overlap-tag">Overlap</span>}
                                    {current.category && <span className="keep-review-category">{current.category}</span>}
                                </div>
                                <h2 id="keep-review-name">{current.serviceName}</h2>
                                {current.reviewFlagged && current.reviewNote && <p className="keep-review-note">“{current.reviewNote}”</p>}
                                {overlapReason.has(current.id) && <p className="keep-review-overlap">{overlapReason.get(current.id)}</p>}
                                {rise && (
                                    <p className="keep-review-price-rise" data-testid="keep-review-price-rise">
                                        Price up from {priceLabel(rise.change.previousAmount, rise.change.previousCurrency, rise.change.previousCadence)} to{' '}
                                        {priceLabel(rise.change.newAmount, rise.change.newCurrency, rise.change.newCadence)} on {dayLabel(rise.change.changedOn)}:{' '}
                                        <strong>{differenceLabel(rise.yearly, rise.change.newCurrency)}</strong>.
                                    </p>
                                )}

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
                                {safeManageUrl(current.manageUrl) && (
                                    <div className="keep-review-manage manage-link-block">
                                        <a className="manage-link" href={safeManageUrl(current.manageUrl)!} target="_blank" rel="noopener noreferrer">
                                            Manage or cancel with {current.serviceName}<span className="visually-hidden"> (opens in a new tab)</span> ↗
                                        </a>
                                        <ManageLinkNote />
                                    </div>
                                )}

                                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                                {currentDecision && (
                                    <p className="keep-review-decided" role="status">
                                        {currentDecision === 'cancelled' ? (
                                            <>
                                                You cancelled this one. To undo it, open{' '}
                                                <RouterLink to={`/subscriptions/${current.id}`}>the subscription</RouterLink> and turn it back on.
                                            </>
                                        ) : (
                                            <>You {currentDecision === 'kept' ? 'kept' : 'skipped'} this one. You can change your mind below.</>
                                        )}
                                    </p>
                                )}

                                {currentDecision === 'cancelled' ? (
                                    <Stack direction="row" className="keep-review-actions">
                                        <Button variant="contained" endIcon={<ArrowForwardRoundedIcon />} onClick={next}>Next</Button>
                                    </Stack>
                                ) : (
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
                                )}
                                <p className="keep-review-keys">
                                    Keys: <kbd>K</kbd> keep · <kbd>C</kbd> cancel · <kbd>S</kbd> skip · <kbd>←</kbd> <kbd>→</kbd> previous and next
                                </p>
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
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button variant="outlined" color="inherit" startIcon={<ArrowBackRoundedIcon />} onClick={() => goTo(queue.length - 1)}>
                                Back to the last one
                            </Button>
                            <Button component={RouterLink} to="/my-subs" variant="contained">Back to dashboard</Button>
                        </Stack>
                    </Paper>
                ) : null}
            </Container>
            <AppFooter />
        </Box>
    );
};

export default ReviewSubscriptionsPage;
