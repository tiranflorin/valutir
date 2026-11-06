import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    InputAdornment,
    MenuItem,
    Paper,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import MonthSummaryCard from '../components/MonthSummaryCard';
import { useAuth } from '../context/AuthContext';
import { useAccountExport } from '../hooks/useAccountExport';
import { API_URL } from '../config';
import { shareOf, splitCount } from '../utils/householdShare';
import { formatCurrency, groupedMoney } from '../utils/money';
import { monthlyEquivalentOf } from '../utils/insights';
import type { ChargeSource } from '../utils/monthCharges';
import './RecurringScreens.css';

type Subscription = {
    id: number;
    serviceName: string;
    category: string | null;
    amount: number | string;
    currency: string;
    billingCadence: string;
    nextBillingDate: string | null;
    startedAt?: string | null;
    notes: string | null;
    status: string;
    autoRenew: boolean;
    b2b: boolean;
    cancelledAt: string | null;
    trialEndsAt?: string | null;
    householdShared?: boolean;
    householdSize?: number | null;
};

type Filter = 'all' | 'upcoming' | 'trials' | 'review' | 'shared' | 'cancelled';
/** Whether amounts show the full bill or the owner's equal share of shared bills. */
type AmountMode = 'full' | 'share';
type SortKey = 'category' | 'amount' | 'billingCadence' | 'nextBillingDate' | 'status';

const normalizeStatus = (status: string) => status.toLowerCase();
const isCancelled = (subscription: Subscription) => normalizeStatus(subscription.status) === 'cancelled';
const isTrial = (subscription: Subscription) => normalizeStatus(subscription.status) === 'trial';
const isShared = (subscription: Subscription) => splitCount(subscription) > 1;

/** One bill's amount: the full bill, or your equal share of it when shared. */
const billAmount = (subscription: Subscription, mode: AmountMode = 'full') => {
    const amount = Number(subscription.amount) || 0;
    return mode === 'share' ? shareOf(amount, subscription) : amount;
};

const monthlyEquivalent = (subscription: Subscription, mode: AmountMode = 'full') =>
    monthlyEquivalentOf(billAmount(subscription, mode), subscription.billingCadence);

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

const ALL_CATEGORIES = '__all__';
const categoryOf = (subscription: Subscription) => subscription.category?.trim() || 'Uncategorized';

/** "in 23 days" under a renewal date further out than formatDate's own "In N days" (up to a week). */
const dueInNote = (value: string | null) => {
    const offset = dayOffset(value);
    return offset !== null && offset > 7 && offset <= 60 ? `in ${offset} days` : null;
};

/** The date a row shows: the cancellation date for cancelled subscriptions, otherwise the next renewal. */
const displayedDate = (subscription: Subscription) =>
    isCancelled(subscription) ? subscription.cancelledAt : subscription.nextBillingDate;

type SubscriptionSort = {
    sortSubscriptions: (items: Subscription[]) => Subscription[];
    toggleSort: (key: SortKey) => void;
    sortMarker: (key: SortKey) => string;
};

const useSubscriptionSort = (): SubscriptionSort => {
    const [sortKey, setSortKey] = useState<SortKey>('nextBillingDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const sortSubscriptions = useCallback((items: Subscription[]) =>
        [...items].sort((left, right) => {
            let comparison = 0;
            if (sortKey === 'amount') comparison = Number(left.amount) - Number(right.amount);
            else if (sortKey === 'nextBillingDate') {
                const leftDate = displayedDate(left);
                const rightDate = displayedDate(right);
                const a = leftDate ? new Date(leftDate).getTime() : Number.MAX_SAFE_INTEGER;
                const b = rightDate ? new Date(rightDate).getTime() : Number.MAX_SAFE_INTEGER;
                comparison = a - b;
            } else {
                const a = sortKey === 'category' ? (left.category || '') : sortKey === 'billingCadence' ? left.billingCadence : statusLabel(left.status);
                const b = sortKey === 'category' ? (right.category || '') : sortKey === 'billingCadence' ? right.billingCadence : statusLabel(right.status);
                comparison = a.localeCompare(b);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        }), [sortKey, sortDirection]);

    const toggleSort = (nextKey: SortKey) => {
        if (sortKey === nextKey) {
            setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(nextKey);
            setSortDirection('asc');
        }
    };

    const sortMarker = (key: SortKey) => sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ' ↕';

    return { sortSubscriptions, toggleSort, sortMarker };
};

type SubscriptionSectionsProps = {
    filter: Filter;
    /** Non-cancelled subscriptions matching the filter. */
    activeSubscriptions: Subscription[];
    cancelledSubscriptions: Subscription[];
    loading: boolean;
    sort: SubscriptionSort;
    amountMode?: AmountMode;
};

/** "My subscriptions" followed by a separate "Cancelled" section; shared by the personal and business views. */
const SubscriptionSections: React.FC<SubscriptionSectionsProps> = ({ filter, activeSubscriptions, cancelledSubscriptions, loading, sort, amountMode = 'full' }) => {
    const { sortSubscriptions, toggleSort, sortMarker } = sort;
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string>(ALL_CATEGORIES);
    const categories = useMemo(
        () => Array.from(new Set([...activeSubscriptions, ...cancelledSubscriptions].map(categoryOf))).sort((a, b) => a.localeCompare(b)),
        [activeSubscriptions, cancelledSubscriptions]
    );
    // A category picked earlier may have no subscriptions left in this filter: show everything then.
    const selectedCategory = categories.includes(category) ? category : ALL_CATEGORIES;
    const narrowed = query.trim() !== '' || selectedCategory !== ALL_CATEGORIES;
    const matches = useCallback((subscription: Subscription) => {
        if (selectedCategory !== ALL_CATEGORIES && categoryOf(subscription) !== selectedCategory) return false;
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return [subscription.serviceName, subscription.category, subscription.notes]
            .some((value) => value?.toLowerCase().includes(needle));
    }, [query, selectedCategory]);
    const visibleCancelled = useMemo(() => cancelledSubscriptions.filter(matches), [cancelledSubscriptions, matches]);
    const mySubscriptions = useMemo(() => sortSubscriptions(activeSubscriptions.filter(matches)), [activeSubscriptions, matches, sortSubscriptions]);
    const sortedCancelled = useMemo(() => sortSubscriptions(visibleCancelled), [visibleCancelled, sortSubscriptions]);
    const showMySubscriptions = filter !== 'cancelled';
    const showCancelledSection = (filter === 'all' || filter === 'cancelled') && visibleCancelled.length > 0;

    return (
        <>
            <div className="list-search">
                <TextField
                    size="small"
                    type="search"
                    placeholder="Search by name, category or notes"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    inputProps={{ 'aria-label': 'Search subscriptions', maxLength: 100 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                />
                {categories.length > 1 && (
                    <TextField
                        select
                        size="small"
                        label="Category"
                        value={selectedCategory}
                        onChange={(event) => setCategory(event.target.value)}
                    >
                        <MenuItem value={ALL_CATEGORIES}>All categories</MenuItem>
                        {categories.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
                    </TextField>
                )}
            </div>
            {showMySubscriptions && (
                <>
                    <div className="list-labels" id="my-subscriptions">
                        <strong>My subscriptions · {mySubscriptions.length}</strong>
                        <span>Category, cost, cadence, next renewal and status</span>
                    </div>
                    {loading ? (
                        <Box sx={{ py: 7, display: 'grid', placeItems: 'center' }}><CircularProgress size={30} /></Box>
                    ) : mySubscriptions.length === 0 ? (
                        <Box sx={{ px: 2.5, pb: 2.5, color: 'text.secondary', fontSize: 14 }}>
                            {filter === 'all' && !narrowed ? 'No active subscriptions.' : 'No subscriptions match this filter.'}
                        </Box>
                    ) : (
                        <SubscriptionsTable subscriptions={mySubscriptions} dateColumnLabel="Next renewal" amountMode={amountMode} onSort={toggleSort} sortMarker={sortMarker} />
                    )}
                </>
            )}

            {!loading && showCancelledSection && (
                <>
                    <div className="list-labels" id="cancelled">
                        <strong>Cancelled · {cancelledSubscriptions.length}</strong>
                        <span>Kept for your records; no further charges expected</span>
                    </div>
                    <SubscriptionsTable subscriptions={sortedCancelled} dateColumnLabel="Cancelled on" amountMode={amountMode} onSort={toggleSort} sortMarker={sortMarker} />
                </>
            )}
            {!loading && filter === 'cancelled' && visibleCancelled.length === 0 && (
                <Box sx={{ px: 2.5, pb: 2.5, color: 'text.secondary', fontSize: 14 }}>
                    {narrowed ? 'No cancelled subscriptions match this search.' : 'No cancelled subscriptions.'}
                </Box>
            )}
        </>
    );
};

type AttentionRowProps = {
    subscription: Subscription;
    meta: string;
    action: string;
    amountMode: AmountMode;
};

const AttentionRow: React.FC<AttentionRowProps> = ({ subscription, meta, action, amountMode }) => (
    <div className="attention-row">
        <img className="service-icon" src={serviceIcon(subscription.serviceName)} alt="" />
        <div>
            <div className="attention-name">{subscription.serviceName}</div>
            <div className="attention-meta">{meta}</div>
        </div>
        <div className="attention-price">{formatCurrency(billAmount(subscription, amountMode), subscription.currency)} / {subscription.billingCadence}</div>
        <RouterLink className="attention-action" to={`/subscriptions/${subscription.id}`}>{action}</RouterLink>
    </div>
);

type SubscriptionsTableProps = {
    subscriptions: Subscription[];
    dateColumnLabel: string;
    amountMode?: AmountMode;
    onSort: (key: SortKey) => void;
    sortMarker: (key: SortKey) => string;
};

const SubscriptionsTable: React.FC<SubscriptionsTableProps> = ({ subscriptions, dateColumnLabel, amountMode = 'full', onSort, sortMarker }) => (
    <div className="subscriptions-table-wrap">
        <table className="subscriptions-table">
            <thead>
                <tr>
                    <th>Service</th>
                    <th><button onClick={() => onSort('category')}>Category{sortMarker('category')}</button></th>
                    <th><button onClick={() => onSort('amount')}>Cost{sortMarker('amount')}</button></th>
                    <th><button onClick={() => onSort('billingCadence')}>Cadence{sortMarker('billingCadence')}</button></th>
                    <th><button onClick={() => onSort('nextBillingDate')}>{dateColumnLabel}{sortMarker('nextBillingDate')}</button></th>
                    <th><button onClick={() => onSort('status')}>Status{sortMarker('status')}</button></th>
                </tr>
            </thead>
            <tbody>
                {subscriptions.map((subscription) => {
                    const status = normalizeStatus(subscription.status);
                    const statusClass = status === 'trial' ? 'trial' : status === 'cancelled' ? 'cancelled' : status === 'other' ? 'review' : '';
                    const cancelled = isCancelled(subscription);
                    return (
                        <tr key={subscription.id}>
                            <td>
                                <RouterLink className="subscription-row-link" to={`/subscriptions/${subscription.id}`}>
                                    <span className="service-cell">
                                        <img className="service-icon" src={serviceIcon(subscription.serviceName)} alt="" />
                                        <span className="service-name">{subscription.serviceName}</span>
                                        {isShared(subscription) && <span className="shared-tag" title={`Split between ${splitCount(subscription)} people`}>Shared</span>}
                                    </span>
                                </RouterLink>
                            </td>
                            <td>{subscription.category || 'Uncategorized'}</td>
                            <td>
                                {formatCurrency(billAmount(subscription, amountMode), subscription.currency)}
                                {amountMode === 'share' && isShared(subscription) && (
                                    <small className="full-bill-note">of {formatCurrency(billAmount(subscription), subscription.currency)}</small>
                                )}
                            </td>
                            <td>{subscription.billingCadence.charAt(0).toUpperCase() + subscription.billingCadence.slice(1)}</td>
                            <td>
                                {formatDate(cancelled ? subscription.cancelledAt : subscription.nextBillingDate)}
                                {!cancelled && dueInNote(subscription.nextBillingDate) && (
                                    <small className="due-in-note">{dueInNote(subscription.nextBillingDate)}</small>
                                )}
                            </td>
                            <td><span className={`status-tag ${statusClass}`}>{statusLabel(subscription.status)}</span></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

const MySubscriptionsPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { token, logout } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const { download: downloadExport, working: exporting, error: exportError } = useAccountExport();
    const [view, setView] = useState<'personal' | 'business'>(() =>
        window.localStorage.getItem('valutir_dashboard_view') === 'business' ? 'business' : 'personal'
    );

    const selectView = (nextView: 'personal' | 'business') => {
        setView(nextView);
        setFilter('all');
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
                const response = await fetch(`${API_URL}/api/subs`, {
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
    const [amountMode, setAmountMode] = useState<AmountMode>('full');
    const sharedSubscriptions = useMemo(() => activeSubscriptions.filter(isShared), [activeSubscriptions]);
    // Only the personal view can split bills; business totals always show full bills.
    const personalAmountMode: AmountMode = view === 'personal' && sharedSubscriptions.length > 0 ? amountMode : 'full';
    const monthChargeAmount = useCallback(
        (subscription: ChargeSource) => {
            const amount = Number(subscription.amount) || 0;
            return personalAmountMode === 'share' ? shareOf(amount, subscription) : amount;
        },
        [personalAmountMode]
    );
    const monthlyTotal = useMemo(
        () => groupedMoney(activeSubscriptions, (subscription) => monthlyEquivalent(subscription, personalAmountMode)),
        [activeSubscriptions, personalAmountMode]
    );

    // Trials are listed by when they end; other subscriptions by their next renewal.
    const renewalsSoon = useMemo(() => dueSoon.filter((subscription) => !isTrial(subscription)), [dueSoon]);
    const attentionCount = trialsEndingSoon.length + renewalsSoon.length;
    const reviewSubscriptions = useMemo(
        () => activeSubscriptions.filter((subscription) => normalizeStatus(subscription.status) === 'other'),
        [activeSubscriptions]
    );

    const sort = useSubscriptionSort();
    // "My subscriptions" never includes cancelled ones; they have their own section at the end.
    const filteredActiveSubscriptions = useMemo(() => {
        if (filter === 'cancelled') return [];
        if (filter === 'upcoming') return dueSoon;
        if (filter === 'trials') return trialSubscriptions;
        if (filter === 'shared') return sharedSubscriptions;
        if (filter === 'review') return reviewSubscriptions;
        return activeSubscriptions;
    }, [filter, dueSoon, trialSubscriptions, sharedSubscriptions, reviewSubscriptions, activeSubscriptions]);
    // Shared bills exist only in the personal view; "Needs review" is the business view's chip.
    const filters: [Filter, string][] = [
        ['all', `All ${contextSubscriptions.length}`],
        ['upcoming', `Upcoming ${dueSoon.length}`],
        ['trials', `Trials ${trialSubscriptions.length}`],
        view === 'business'
            ? ['review', `Needs review ${reviewSubscriptions.length}`]
            : ['shared', `Shared ${sharedSubscriptions.length}`],
        ['cancelled', `Cancelled ${cancelledSubscriptions.length}`],
    ];

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

                {!error && !loading && contextSubscriptions.length === 0 ? (
                    <Paper className="dashboard-list">
                        <div className="empty-state">
                            <div className="empty-symbol" aria-hidden="true">＋</div>
                            {view === 'business' ? (
                                <>
                                    <h2>No business subscriptions yet</h2>
                                    <p>Add a work subscription and mark it as Business to see it in this view.</p>
                                </>
                            ) : (
                                <>
                                    <h2>No subscriptions yet</h2>
                                    <p>Add the recurring services you want to keep an eye on. Start with one and add more later.</p>
                                </>
                            )}
                            <Button component={RouterLink} to="/subscriptions/new" variant="contained" className="add-subscription">
                                {view === 'business' ? 'Add a business subscription' : 'Add your first subscription'}
                            </Button>
                        </div>
                    </Paper>
                ) : (
                    <>
                        {sharedSubscriptions.length > 0 && view === 'personal' && (
                            <Box className="amount-mode-switch">
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
                                <span>{amountMode === 'share' ? 'Shared bills count only your part.' : 'Shared bills count in full.'}</span>
                            </Box>
                        )}
                        {!loading && (
                            <MonthSummaryCard
                                subscriptions={activeSubscriptions}
                                amountFor={monthChargeAmount}
                                summary={<><strong>{monthlyTotal}</strong> / month on average · <RouterLink to="/insights">See insights →</RouterLink></>}
                            />
                        )}

                        {!loading && attentionCount > 0 && (
                            <Paper className="dashboard-list attention-card" component="section" aria-labelledby="attention-title">
                                <div className="list-head">
                                    <h2 id="attention-title">Needs attention · {attentionCount}</h2>
                                    <span className="list-count">Trials ending and renewals in the next 7 days</span>
                                </div>
                                <div className="attention-list">
                                    {trialsEndingSoon.map((subscription) => (
                                        <AttentionRow
                                            key={`trial-${subscription.id}`}
                                            subscription={subscription}
                                            meta={`TRIAL ENDS · ${formatDate(subscription.trialEndsAt || subscription.nextBillingDate)}`}
                                            action="Review trial →"
                                            amountMode={personalAmountMode}
                                        />
                                    ))}
                                    {renewalsSoon.map((subscription) => (
                                        <AttentionRow
                                            key={`renewal-${subscription.id}`}
                                            subscription={subscription}
                                            meta={`RENEWS · ${formatDate(subscription.nextBillingDate)}`}
                                            action="Review →"
                                            amountMode={personalAmountMode}
                                        />
                                    ))}
                                </div>
                            </Paper>
                        )}

                        <Paper className="dashboard-list" id="all">
                            <div className="list-head">
                                <h2>{view === 'business' ? 'All business subscriptions' : 'All personal subscriptions'}</h2>
                                <span className="list-head-actions">
                                    <span className="list-count">{activeSubscriptions.length} active · {cancelledSubscriptions.length} cancelled</span>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        className="export-csv"
                                        startIcon={<FileDownloadRoundedIcon fontSize="small" />}
                                        disabled={exporting !== null}
                                        onClick={() => void downloadExport('csv', view)}
                                    >
                                        {exporting ? 'Preparing...' : 'Export CSV'}
                                    </Button>
                                </span>
                            </div>
                            {exportError && <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{exportError}</Alert>}
                            <div className="dashboard-filters" aria-label="Filter subscriptions">
                                {filters.map(([key, label]) => (
                                    <Chip key={key} label={label} onClick={() => setFilter(key)} className={filter === key ? 'selected' : ''} />
                                ))}
                            </div>

                            <SubscriptionSections
                                filter={filter}
                                activeSubscriptions={filteredActiveSubscriptions}
                                cancelledSubscriptions={cancelledSubscriptions}
                                loading={loading}
                                sort={sort}
                                amountMode={personalAmountMode}
                            />
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
