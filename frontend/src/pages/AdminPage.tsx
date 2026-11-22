import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Paper, TextField } from '@mui/material';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { useAccountErrorHandler } from '../hooks/useAccountErrorHandler';
import { type AdminAccount, type AdminOverview, fetchAdminOverview, lookUpAccount } from '../services/admin';
import { ApiError } from '../services/account';
import { formatCurrency } from '../utils/money';

const ADMIN_ROLE = 'ROLE_ADMIN';

const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso));

const dateTimeLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const money = (cents: number, currency: string) => formatCurrency(cents / 100, currency);

const Facts: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
    <dl className="admin-facts">
        {rows.map(([label, value]) => (
            <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
            </div>
        ))}
    </dl>
);

const planOf = (account: AdminAccount) => {
    if (account.unlockedAt) return `Paid, unlocked ${dateLabel(account.unlockedAt)}`;
    if (account.admin) return 'Admin: paid features without paying';
    return 'Free';
};

const remindersOf = (account: AdminAccount) => {
    if (!account.remindersEnabled) return 'Off';
    // Unverified accounts are never reminded, whatever the setting.
    if (!account.emailVerifiedAt) return 'On, but not sent until the email is verified';
    return account.remindersProcessedOn
        ? `On (${account.timezone}), last handled for ${dateLabel(account.remindersProcessedOn)}`
        : `On (${account.timezone}), not handled yet`;
};

const AccountResult: React.FC<{ account: AdminAccount; freeLimit: number | null }> = ({ account, freeLimit }) => (
    <div className="admin-account">
        <Facts rows={[
            ['Email', account.email],
            ['Plan', planOf(account)],
            ['Email verified', account.emailVerifiedAt ? dateLabel(account.emailVerifiedAt) : 'No'],
            ['Created', dateLabel(account.createdAt)],
            ['Active subscriptions', !account.paidFeatures && freeLimit ? `${account.activeSubscriptions} of ${freeLimit}` : String(account.activeSubscriptions)],
            ['Reminders', remindersOf(account)],
        ]} />
        <h3>Purchases</h3>
        {account.purchases.length === 0 ? <p className="admin-note">None.</p> : (
            <table className="admin-table">
                <thead>
                    <tr><th>Started</th><th>Amount</th><th>Status</th><th>Paid</th><th>Refunded or disputed</th></tr>
                </thead>
                <tbody>
                    {account.purchases.map((purchase) => (
                        <tr key={purchase.createdAt}>
                            <td>{dateTimeLabel(purchase.createdAt)}</td>
                            <td>{money(purchase.amountInCents, purchase.currency)}</td>
                            <td>{purchase.status}</td>
                            <td>{purchase.paidAt ? dateTimeLabel(purchase.paidAt) : '–'}</td>
                            <td>{purchase.revokedAt ? dateTimeLabel(purchase.revokedAt) : '–'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
);

/**
 * The operator's read-only page: one account's status for a support or refund request, account and
 * purchase counts, and signs that a background job stopped. The API allows it for ROLE_ADMIN only.
 */
const AdminPage: React.FC = () => {
    const { token, user } = useAuth();
    const errorMessage = useAccountErrorHandler();
    const isAdmin = user?.roles?.includes(ADMIN_ROLE) === true;
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [overviewError, setOverviewError] = useState('');
    const [email, setEmail] = useState('');
    const [account, setAccount] = useState<AdminAccount | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [looking, setLooking] = useState(false);

    useEffect(() => {
        if (!isAdmin) return undefined;
        let cancelled = false;
        fetchAdminOverview(token).then(
            (data) => {
                if (!cancelled) setOverview(data);
            },
            (error: unknown) => {
                const message = errorMessage(error);
                if (!cancelled && message !== null) setOverviewError(message);
            },
        );
        return () => {
            cancelled = true;
        };
    }, [isAdmin, token, errorMessage]);

    const lookUp = async (event: React.FormEvent) => {
        event.preventDefault();
        setLooking(true);
        setLookupError('');
        setAccount(null);
        try {
            setAccount(await lookUpAccount(token, email));
        } catch (error) {
            const message = error instanceof ApiError && error.status === 404 ? 'No account uses that email.' : errorMessage(error);
            if (message !== null) setLookupError(message);
        } finally {
            setLooking(false);
        }
    };

    const content = !isAdmin ? (
        <Alert severity="info">This page is for admin accounts.</Alert>
    ) : (
        <>
            <Paper className="settings-card" component="section" aria-labelledby="admin-lookup-title">
                <div className="settings-section-heading">
                    <h2 id="admin-lookup-title">Look up an account</h2>
                    <p>Its plan, purchases and reminder status, for a support or refund request. Never its subscriptions. Each lookup is logged.</p>
                </div>
                <Box component="form" className="admin-lookup" onSubmit={(event) => void lookUp(event)}>
                    <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth size="small" />
                    <Button type="submit" variant="contained" disabled={looking || !email.trim()}>
                        {looking ? 'Looking up...' : 'Look up'}
                    </Button>
                </Box>
                {lookupError && <Alert severity="error" sx={{ mt: 2 }}>{lookupError}</Alert>}
                {account && <AccountResult account={account} freeLimit={overview?.nearFreeLimit.limit ?? null} />}
            </Paper>

            {overviewError && <Alert severity="error">{overviewError}</Alert>}
            {!overview && !overviewError && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
            {overview && (
                <>
                    <Paper className="settings-card" component="section" aria-labelledby="admin-accounts-title">
                        <div className="settings-section-heading">
                            <h2 id="admin-accounts-title">Accounts</h2>
                            <p>Admins get the paid features without paying, so they count as neither paid nor free.</p>
                        </div>
                        <Facts rows={[
                            ['All accounts', overview.accounts.total],
                            ['Paid', overview.accounts.paid],
                            ['Free', overview.accounts.free],
                            ['Admins', overview.accounts.admins],
                            ['Email verified', overview.accounts.verified],
                            ['Not verified yet', overview.accounts.unverified],
                            ['Created in the last 7 days', overview.accounts.createdLast7Days],
                            ['Created in the last 30 days', overview.accounts.createdLast30Days],
                        ]} />
                        <p className="admin-note">Sign-up dates are recorded from 22 Nov 2026; older accounts aren&apos;t in the last two counts.</p>
                        <p className="admin-note" data-testid="admin-near-limit">
                            {overview.nearFreeLimit.accounts} free {overview.nearFreeLimit.accounts === 1 ? 'account has' : 'accounts have'} {overview.nearFreeLimit.threshold} or
                            more of the {overview.nearFreeLimit.limit} active subscriptions the free plan allows.
                        </p>
                    </Paper>

                    <Paper className="settings-card" component="section" aria-labelledby="admin-purchases-title">
                        <div className="settings-section-heading">
                            <h2 id="admin-purchases-title">Purchases</h2>
                            <p>Every checkout started, by what happened to it.</p>
                        </div>
                        <Facts rows={[
                            ...Object.entries(overview.purchases.byStatus).map(([status, count]): [string, React.ReactNode] => [status, count]),
                            ['Paid and kept', Object.entries(overview.purchases.paidByCurrency).map(([currency, cents]) => money(cents, currency)).join(' and ') || money(0, 'EUR')],
                        ]} />
                        <p className="admin-note">Paid and kept leaves out refunded and disputed payments. It includes VAT and is before Stripe&apos;s fees.</p>
                    </Paper>

                    <Paper className="settings-card" component="section" aria-labelledby="admin-health-title">
                        <div className="settings-section-heading">
                            <h2 id="admin-health-title">Background work</h2>
                            <p>Checked {dateTimeLabel(overview.generatedAt)}.</p>
                        </div>
                        <Facts rows={[
                            ['Checkouts pending for over an hour', overview.health.oldestStalePendingAt
                                ? `${overview.health.stalePendingPurchases} (oldest ${dateTimeLabel(overview.health.oldestStalePendingAt)})`
                                : overview.health.stalePendingPurchases],
                            ['Reminder emails sent in the last 24 hours', overview.health.remindersSentLast24Hours],
                            ['Last day the reminder run handled', overview.health.latestReminderDay ? dateLabel(overview.health.latestReminderDay) : 'Never'],
                        ]} />
                        <p className="admin-note">
                            Checkouts expire after 30 minutes and Stripe then tells the API, so the first figure should be 0: more means
                            the Stripe webhook isn&apos;t getting through. The reminder run&apos;s last day should be today or yesterday
                            (it&apos;s each account&apos;s local day); an older one means the hourly commands stopped.
                        </p>
                    </Paper>
                </>
            )}
        </>
    );

    return (
        <Box className="dashboard-page settings-page">
            <AppHeader />
            <Container component="main" className="settings-container admin-page">
                <Box className="settings-page-heading">
                    <h1>Admin</h1>
                    <p>For the operator: support lookups, account and purchase counts, and the scheduled jobs.</p>
                </Box>
                {content}
            </Container>
            <AppFooter />
        </Box>
    );
};

export default AdminPage;
