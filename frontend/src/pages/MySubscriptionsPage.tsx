import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Paper,
    Tooltip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { VITE_API_URL } from '../services/auth';
import './RecurringScreens.css';

type Subscription = {
    id: number;
    serviceName: string;
    category: string | null;
    amount: number | string;
    currency: string;
    billingCadence: string;
    nextBillingDate: string | null;
    notes: string | null;
    status: string;
    autoRenew: boolean;
    b2b: boolean;
    cancelledAt: string | null;
    trialEndsAt?: string | null;
};

type Filter = 'all' | 'upcoming' | 'trials' | 'review' | 'cancelled';
type SortKey = 'category' | 'amount' | 'billingCadence' | 'nextBillingDate' | 'status';

const normalizeStatus = (status: string) => status.toLowerCase();
const isCancelled = (subscription: Subscription) => normalizeStatus(subscription.status) === 'cancelled';
const isTrial = (subscription: Subscription) => normalizeStatus(subscription.status) === 'trial';

const monthlyEquivalent = (subscription: Subscription) => {
    const amount = Number(subscription.amount) || 0;
    switch (subscription.billingCadence.toLowerCase()) {
        case 'daily': return amount * 365 / 12;
        case 'weekly': return amount * 52 / 12;
        case 'quarterly': return amount / 3;
        case 'yearly': return amount / 12;
        case 'monthly': return amount;
        default: return amount;
    }
};

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'EUR' }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency || 'EUR'}`;
    }
};

const groupedMoney = (items: Subscription[], valueFor: (subscription: Subscription) => number) => {
    const totals = new Map<string, number>();
    items.forEach((subscription) => {
        const currency = subscription.currency || 'EUR';
        totals.set(currency, (totals.get(currency) || 0) + valueFor(subscription));
    });
    if (!totals.size) return formatCurrency(0, 'EUR');
    return Array.from(totals.entries()).map(([currency, total]) => formatCurrency(total, currency)).join(' + ');
};

const dayOffset = (value: string | null) => {
    if (!value) return null;
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / 86_400_000);
};

const formatDate = (value: string | null) => {
    if (!value) return 'No date set';
    const offset = dayOffset(value);
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    if (offset !== null && offset > 1 && offset <= 7) return `In ${offset} days`;
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const serviceIcon = (name: string) => {
    const normalized = name.toLowerCase();
    const icons: [string, string][] = [
        ['netflix', 'netflix'], ['spotify', 'spotify'], ['icloud', 'icloud-plus'],
        ['game pass', 'game-pass'], ['xbox', 'game-pass'], ['adobe', 'adobe'],
        ['github', 'github'], ['chatgpt', 'chatgpt'], ['hosting', 'cloud-hosting'],
        ['domain', 'domain'], ['figma', 'figma'], ['design', 'design-app'],
        ['storage', 'cloud-storage'], ['newsletter', 'newsletter'], ['news', 'news-app'],
        ['email', 'email-suite'], ['crm', 'crm'], ['project', 'project-tool'],
    ];
    const match = icons.find(([key]) => normalized.includes(key));
    return `/service-icons/${match?.[1] || 'api-tool'}.svg`;
};

const statusLabel = (status: string) => {
    switch (normalizeStatus(status)) {
        case 'trial': return 'Trial';
        case 'cancelled': return 'Cancelled';
        case 'other': return 'Review';
        default: return 'Active';
    }
};

type BusinessDashboardProps = {
    subscriptions: Subscription[];
    loading: boolean;
    monthlyTotal: string;
    activeSubscriptions: Subscription[];
    dueSoon: Subscription[];
    trialSubscriptions: Subscription[];
    trialsEndingSoon: Subscription[];
    cancelledSubscriptions: Subscription[];
};

const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
    subscriptions,
    loading,
    monthlyTotal,
    activeSubscriptions,
    dueSoon,
    trialSubscriptions,
    trialsEndingSoon,
    cancelledSubscriptions,
}) => {
    const annualCommitments = activeSubscriptions.filter((subscription) => {
        const offset = dayOffset(subscription.nextBillingDate);
        return subscription.billingCadence.toLowerCase() === 'yearly'
            && offset !== null && offset >= 0 && offset <= 90;
    });
    const renewalAttention = dueSoon.filter((subscription) => !isTrial(subscription));
    const businessFilters: [Filter, string][] = [
        ['all', `All ${subscriptions.length}`],
        ['upcoming', `Upcoming ${dueSoon.length}`],
        ['trials', `Trials ${trialSubscriptions.length}`],
        ['review', `Needs review ${subscriptions.filter((subscription) => normalizeStatus(subscription.status) === 'other').length}`],
        ['cancelled', `Cancelled ${cancelledSubscriptions.length}`],
    ];
    const [filter, setFilter] = useState<Filter>('all');
    const filteredSubscriptions = useMemo(() => {
        if (filter === 'upcoming') return dueSoon;
        if (filter === 'trials') return trialSubscriptions;
        if (filter === 'review') return subscriptions.filter((subscription) => normalizeStatus(subscription.status) === 'other');
        if (filter === 'cancelled') return cancelledSubscriptions;
        return subscriptions;
    }, [filter, dueSoon, trialSubscriptions, cancelledSubscriptions, subscriptions]);

    return (
        <>
            <section className="metric-grid" aria-label="Business recurring costs">
                <Paper className="metric-card">
                    <span className="metric-label">Due in next 7 days</span>
                    <div className="metric-value">{groupedMoney(dueSoon, (subscription) => Number(subscription.amount) || 0)}</div>
                    <div className="metric-hint">{dueSoon.length} expected charge{dueSoon.length === 1 ? '' : 's'}</div>
                </Paper>
                <Paper className="metric-card trial-warning">
                    <span className="metric-label">Trial ending soon</span>
                    <div className="metric-value">{trialsEndingSoon.length} <small>{trialsEndingSoon.length === 1 ? 'subscription' : 'subscriptions'}</small></div>
                    <div className="metric-hint">Review before the first charge</div>
                </Paper>
                <Paper className="metric-card primary-metric">
                    <span className="metric-label">Business monthly equivalent</span>
                    <div className="metric-value">{monthlyTotal}</div>
                    <div className="metric-hint">{groupedMoney(activeSubscriptions, (subscription) => monthlyEquivalent(subscription) * 12)} annual run rate</div>
                </Paper>
            </section>

            <section className="metric-grid" aria-label="Business subscription counts">
                <Paper className="metric-card">
                    <span className="metric-label">Annual commitments · next 90 days</span>
                    <div className="metric-value">{groupedMoney(annualCommitments, (subscription) => Number(subscription.amount) || 0)} <small>due</small></div>
                    <div className="metric-hint">{annualCommitments.length} annual renewal{annualCommitments.length === 1 ? '' : 's'}</div>
                </Paper>
                <Paper className="metric-card">
                    <span className="metric-label">Trial subscriptions</span>
                    <div className="metric-value">{trialSubscriptions.length} <small>tracked</small></div>
                    <div className="metric-hint">{trialsEndingSoon.length} need attention soon</div>
                </Paper>
                <Paper className="metric-card">
                    <span className="metric-label">Active business subscriptions</span>
                    <div className="metric-value">{activeSubscriptions.length} <small>including trials</small></div>
                    <div className="metric-hint">{cancelledSubscriptions.length} cancelled · available in the filter</div>
                </Paper>
            </section>

            <Paper className="dashboard-list business-inventory">
                <div className="list-head"><h2>All business subscriptions</h2><span className="list-count">{activeSubscriptions.length} active · {cancelledSubscriptions.length} cancelled</span></div>
                <div className="dashboard-filters" aria-label="Filter business subscriptions">
                    {businessFilters.map(([key, label]) => <Chip key={key} label={label} onClick={() => setFilter(key)} className={filter === key ? 'selected' : ''} />)}
                </div>
                <div className="list-labels"><strong>Needs attention · {trialsEndingSoon.length + renewalAttention.length}</strong><span>Trial conversion first, then upcoming renewals</span></div>
                {trialsEndingSoon.map((subscription) => <div className="attention-row" key={subscription.id}>
                    <img className="service-icon" src={serviceIcon(subscription.serviceName)} alt="" />
                    <div><div className="attention-name">{subscription.serviceName}</div><div className="attention-meta">TRIAL ENDS · {formatDate(subscription.trialEndsAt || subscription.nextBillingDate)}</div></div>
                    <div className="attention-price">{formatCurrency(Number(subscription.amount) || 0, subscription.currency)} / {subscription.billingCadence}</div>
                    <RouterLink className="attention-action" to={`/subscriptions/${subscription.id}`}>Review trial →</RouterLink>
                </div>)}
                {renewalAttention.map((subscription) => <div className="attention-row business-renewal-attention" key={subscription.id}>
                    <img className="service-icon" src={serviceIcon(subscription.serviceName)} alt="" />
                    <div><div className="attention-name">{subscription.serviceName}</div><div className="attention-meta">RENEWS · {formatDate(subscription.nextBillingDate)}</div></div>
                    <div className="attention-price">{formatCurrency(Number(subscription.amount) || 0, subscription.currency)} / {subscription.billingCadence}</div>
                    <RouterLink className="attention-action" to={`/subscriptions/${subscription.id}`}>Review →</RouterLink>
                </div>)}
                {loading ? <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>
                    : filteredSubscriptions.length ? <div className="subscriptions-table-wrap"><table className="subscriptions-table">
                        <thead><tr><th>Service</th><th>Category</th><th>Cost</th><th>Cadence</th><th>Next renewal</th><th>Status</th></tr></thead>
                        <tbody>{filteredSubscriptions.map((subscription) => {
                            const status = normalizeStatus(subscription.status);
                            const statusClass = status === 'trial' ? 'trial' : status === 'cancelled' ? 'cancelled' : status === 'other' ? 'review' : '';
                            return <tr key={subscription.id}><td><RouterLink className="subscription-row-link" to={`/subscriptions/${subscription.id}`}><span className="service-cell"><img className="service-icon" src={serviceIcon(subscription.serviceName)} alt="" /><span className="service-name">{subscription.serviceName}</span></span></RouterLink></td><td>{subscription.category || 'Uncategorized'}</td><td>{formatCurrency(Number(subscription.amount) || 0, subscription.currency)}</td><td>{subscription.billingCadence}</td><td>{formatDate(subscription.nextBillingDate)}</td><td><span className={`status-tag ${statusClass}`}>{statusLabel(subscription.status)}</span></td></tr>;
                        })}</tbody>
                    </table></div> : <Box sx={{ px: 2.5, pb: 2.5, color: 'text.secondary', fontSize: 14 }}>No subscriptions match this filter.</Box>}
            </Paper>
        </>
    );
};

const MySubscriptionsPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { token, logout } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('nextBillingDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [view, setView] = useState<'personal' | 'business'>(() =>
        window.localStorage.getItem('valutir_dashboard_view') === 'business' ? 'business' : 'personal'
    );

    const selectView = (nextView: 'personal' | 'business') => {
        setView(nextView);
        window.localStorage.setItem('valutir_dashboard_view', nextView);
    };

    const deletedSubscriptionMessage =
        (location.state as { deletedSubscriptionMessage?: string } | null)?.deletedSubscriptionMessage ?? '';

    useEffect(() => {
        const loadSubscriptions = async () => {
            if (!token) {
                setLoading(false);
                setError('You are not authenticated.');
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`${VITE_API_URL}/api/subs`, {
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                });
                const data = await response.json().catch(() => null);
                if (!response.ok) {
                    if (response.status === 401) {
                        logout();
                        navigate('/login', { replace: true });
                        return;
                    }
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
    }, [token, logout, navigate]);

    const contextSubscriptions = useMemo(
        () => subscriptions.filter((subscription) => view === 'business' ? subscription.b2b === true : subscription.b2b !== true),
        [subscriptions, view]
    );
    const activeSubscriptions = useMemo(
        () => contextSubscriptions.filter((subscription) => !isCancelled(subscription)),
        [contextSubscriptions]
    );
    const cancelledSubscriptions = useMemo(
        () => contextSubscriptions.filter(isCancelled),
        [contextSubscriptions]
    );
    const trialSubscriptions = useMemo(
        () => activeSubscriptions.filter(isTrial),
        [activeSubscriptions]
    );
    const dueSoon = useMemo(
        () => activeSubscriptions.filter((subscription) => {
            const offset = dayOffset(subscription.nextBillingDate);
            return offset !== null && offset >= 0 && offset <= 7;
        }),
        [activeSubscriptions]
    );
    const trialsEndingSoon = useMemo(
        () => trialSubscriptions.filter((subscription) => {
            const offset = dayOffset(subscription.trialEndsAt || subscription.nextBillingDate);
            return offset !== null && offset >= 0 && offset <= 7;
        }),
        [trialSubscriptions]
    );
    const monthlyTotal = useMemo(
        () => groupedMoney(activeSubscriptions, monthlyEquivalent),
        [activeSubscriptions]
    );

    const filteredSubscriptions = useMemo(() => {
        let result = contextSubscriptions;
        if (filter === 'upcoming') result = dueSoon;
        if (filter === 'trials') result = trialSubscriptions;
        if (filter === 'review') result = contextSubscriptions.filter((subscription) => normalizeStatus(subscription.status) === 'other');
        if (filter === 'cancelled') result = cancelledSubscriptions;
        const sorted = [...result].sort((left, right) => {
            let comparison = 0;
            if (sortKey === 'amount') comparison = Number(left.amount) - Number(right.amount);
            else if (sortKey === 'nextBillingDate') {
                const a = left.nextBillingDate ? new Date(left.nextBillingDate).getTime() : Number.MAX_SAFE_INTEGER;
                const b = right.nextBillingDate ? new Date(right.nextBillingDate).getTime() : Number.MAX_SAFE_INTEGER;
                comparison = a - b;
            } else {
                const a = sortKey === 'category' ? (left.category || '') : sortKey === 'billingCadence' ? left.billingCadence : statusLabel(left.status);
                const b = sortKey === 'category' ? (right.category || '') : sortKey === 'billingCadence' ? right.billingCadence : statusLabel(right.status);
                comparison = a.localeCompare(b);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [contextSubscriptions, dueSoon, trialSubscriptions, cancelledSubscriptions, filter, sortKey, sortDirection]);

    const toggleSort = (nextKey: SortKey) => {
        if (sortKey === nextKey) {
            setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(nextKey);
            setSortDirection('asc');
        }
    };

    const sortMarker = (key: SortKey) => sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ' ↕';

    return (
        <Box className="dashboard-page">
            <AppHeader />
            <Container className="dashboard-container">
                <Box className="dashboard-heading">
                    <div>
                        <h1>{view === 'business' ? 'Business subscriptions' : 'Your recurring expenses'}</h1>
                        <p>{view === 'business'
                            ? 'Track business tools, annual commitments, and upcoming renewals.'
                            : 'See what you pay, what renews next, and what may need a review.'}</p>
                        <nav className="view-switch" aria-label="Subscription view">
                            <button type="button" aria-current={view === 'personal' ? 'page' : undefined} onClick={() => selectView('personal')}>Personal</button>
                            <button type="button" aria-current={view === 'business' ? 'page' : undefined} onClick={() => selectView('business')}>Business</button>
                        </nav>
                    </div>
                    <Box className="dashboard-heading-actions">
                        <Button component={RouterLink} to="/subscriptions/new" startIcon={<AddRoundedIcon />} variant="contained" className="add-subscription">
                            Add subscription
                        </Button>
                    </Box>
                </Box>

                {deletedSubscriptionMessage && <Alert severity="success" sx={{ mb: 2 }}>{deletedSubscriptionMessage}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {view === 'business' && !error && !loading && contextSubscriptions.length === 0 ? (
                    <Paper className="dashboard-list">
                        <div className="empty-state">
                            <div className="empty-symbol" aria-hidden="true">＋</div>
                            <h2>No business subscriptions yet</h2>
                            <p>Add a work subscription and mark it as Business to see it in this view.</p>
                            <Button component={RouterLink} to="/subscriptions/new" variant="contained" className="add-subscription">
                                Add a business subscription
                            </Button>
                        </div>
                    </Paper>
                ) : view === 'business' ? (
                    <BusinessDashboard
                        subscriptions={contextSubscriptions}
                        loading={loading}
                        monthlyTotal={monthlyTotal}
                        activeSubscriptions={activeSubscriptions}
                        dueSoon={dueSoon}
                        trialSubscriptions={trialSubscriptions}
                        trialsEndingSoon={trialsEndingSoon}
                        cancelledSubscriptions={cancelledSubscriptions}
                    />
                ) : !error && !loading && contextSubscriptions.length === 0 ? (
                    <Paper className="dashboard-list">
                        <div className="empty-state">
                            <div className="empty-symbol" aria-hidden="true">＋</div>
                            <h2>No subscriptions yet</h2>
                            <p>Add the recurring services you want to keep an eye on. Start with one and add more later.</p>
                            <Button component={RouterLink} to="/subscriptions/new" variant="contained" className="add-subscription">
                                Add your first subscription
                            </Button>
                        </div>
                    </Paper>
                ) : (
                    <>
                        <section className="metric-grid" aria-label="Upcoming and recurring costs">
                            <Paper className="metric-card">
                                <span className="metric-label">Due in next 7 days</span>
                                <div className="metric-value">{groupedMoney(dueSoon, (subscription) => Number(subscription.amount) || 0)}</div>
                                <div className="metric-hint">{dueSoon.length ? `${dueSoon.length} expected charge${dueSoon.length === 1 ? '' : 's'}` : 'No charges due this week'}</div>
                            </Paper>
                            <Paper className="metric-card trial-warning">
                                <span className="metric-label">Trial ending soon</span>
                                <div className="metric-value">{trialsEndingSoon.length} <small>{trialsEndingSoon.length === 1 ? 'subscription' : 'subscriptions'}</small></div>
                                <div className="metric-hint">{trialsEndingSoon.length ? 'Review before the first charge' : 'No trials ending in the next 7 days'}</div>
                            </Paper>
                            <Paper className="metric-card primary-metric">
                                <span className="metric-label">Tracked recurring bills</span>
                                <div className="metric-value">{monthlyTotal} <small>/ month</small></div>
                                <div className="metric-hint">{groupedMoney(activeSubscriptions, (subscription) => monthlyEquivalent(subscription) * 12)} annual run rate · full bill amounts</div>
                            </Paper>
                        </section>

                        <section className="metric-grid" aria-label="Subscription counts">
                            <Paper className="metric-card">
                                <span className="metric-label">Trial subscriptions</span>
                                <div className="metric-value">{trialSubscriptions.length} <small>tracked</small></div>
                                <div className="metric-hint">{trialsEndingSoon.length} need attention soon</div>
                            </Paper>
                            <Paper className="metric-card">
                                <span className="metric-label">Shared with household</span>
                                <div className="metric-value">—</div>
                                <div className="metric-hint">Household sharing isn’t available in the current account data</div>
                            </Paper>
                            <Paper className="metric-card">
                                <span className="metric-label">Active subscriptions</span>
                                <div className="metric-value">{activeSubscriptions.length} <small>including trials</small></div>
                                <div className="metric-hint">{cancelledSubscriptions.length} cancelled · available in the filter</div>
                            </Paper>
                        </section>

                        <Paper className="dashboard-list" id="all">
                            <div className="list-head">
                                <h2>All personal subscriptions</h2>
                                <span className="list-count">{activeSubscriptions.length} active · {cancelledSubscriptions.length} cancelled</span>
                            </div>
                            <div className="dashboard-filters" aria-label="Filter subscriptions">
                                {([
                                    ['all', `All ${contextSubscriptions.length}`],
                                    ['upcoming', `Upcoming ${dueSoon.length}`],
                                    ['trials', `Trials ${trialSubscriptions.length}`],
                                    ['cancelled', `Cancelled ${cancelledSubscriptions.length}`],
                                ] as [Filter, string][]).map(([key, label]) => (
                                    <Chip key={key} label={label} onClick={() => setFilter(key)} className={filter === key ? 'selected' : ''} />
                                ))}
                                <Tooltip title="Household sharing is not available in the current API data">
                                    <span><Chip label="Shared" disabled /></span>
                                </Tooltip>
                            </div>

                            <div className="list-labels" id="attention">
                                <strong>Needs attention · {trialsEndingSoon.length}</strong>
                                <span>Trials first, then upcoming renewals</span>
                            </div>
                            {trialsEndingSoon.length > 0 && (
                                <div className="attention-list">
                                    {trialsEndingSoon.map((subscription) => {
                                        const endsAt = subscription.trialEndsAt || subscription.nextBillingDate;
                                        return (
                                            <div className="attention-row" key={subscription.id}>
                                                <img className="service-icon" src={serviceIcon(subscription.serviceName)} alt="" />
                                                <div>
                                                    <div className="attention-name">{subscription.serviceName}</div>
                                                    <div className="attention-meta">TRIAL ENDS · {formatDate(endsAt)}</div>
                                                </div>
                                                <div className="attention-price">{formatCurrency(Number(subscription.amount) || 0, subscription.currency)} / {subscription.billingCadence}</div>
                                                <RouterLink className="attention-action" to={`/subscriptions/${subscription.id}`}>Review trial →</RouterLink>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {trialsEndingSoon.length === 0 && (
                                <div className="list-labels"><span>No trials are ending in the next 7 days.</span></div>
                            )}

                            <div className="list-labels">
                                <strong>Other subscriptions</strong>
                                <span>Category, cost, cadence, next renewal and status</span>
                            </div>

                            {loading ? (
                                <Box sx={{ py: 7, display: 'grid', placeItems: 'center' }}><CircularProgress size={30} /></Box>
                            ) : filteredSubscriptions.length === 0 ? (
                                <Box sx={{ px: 2.5, pb: 2.5, color: 'text.secondary', fontSize: 14 }}>
                                    No subscriptions match this filter.
                                </Box>
                            ) : (
                                <div className="subscriptions-table-wrap">
                                    <table className="subscriptions-table">
                                        <thead>
                                            <tr>
                                                <th>Service</th>
                                                <th><button onClick={() => toggleSort('category')}>Category{sortMarker('category')}</button></th>
                                                <th><button onClick={() => toggleSort('amount')}>Cost{sortMarker('amount')}</button></th>
                                                <th><button onClick={() => toggleSort('billingCadence')}>Cadence{sortMarker('billingCadence')}</button></th>
                                                <th><button onClick={() => toggleSort('nextBillingDate')}>Next renewal{sortMarker('nextBillingDate')}</button></th>
                                                <th><button onClick={() => toggleSort('status')}>Status{sortMarker('status')}</button></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubscriptions.map((subscription) => {
                                                const status = normalizeStatus(subscription.status);
                                                const statusClass = status === 'trial' ? 'trial' : status === 'cancelled' ? 'cancelled' : status === 'other' ? 'review' : '';
                                                const renewalDate = isCancelled(subscription) ? subscription.cancelledAt : subscription.nextBillingDate;
                                                return (
                                                    <tr key={subscription.id}>
                                                        <td>
                                                            <RouterLink className="subscription-row-link" to={`/subscriptions/${subscription.id}`}>
                                                                <span className="service-cell">
                                                                    <img className="service-icon" src={serviceIcon(subscription.serviceName)} alt="" />
                                                                    <span className="service-name">{subscription.serviceName}</span>
                                                                </span>
                                                            </RouterLink>
                                                        </td>
                                                        <td>{subscription.category || 'Uncategorized'}</td>
                                                        <td>{formatCurrency(Number(subscription.amount) || 0, subscription.currency)}</td>
                                                        <td>{subscription.billingCadence.charAt(0).toUpperCase() + subscription.billingCadence.slice(1)}</td>
                                                        <td>{isCancelled(subscription) ? `Cancelled ${formatDate(renewalDate)}` : formatDate(renewalDate)}</td>
                                                        <td><span className={`status-tag ${statusClass}`}>{statusLabel(subscription.status)}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="list-labels"><span>Costs are shown using each subscription’s stored currency. Currency preferences can be added without changing these records.</span></div>
                        </Paper>
                    </>
                )}
            </Container>
            <AppFooter />
        </Box>
    );
};

export default MySubscriptionsPage;
