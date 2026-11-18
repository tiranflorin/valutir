import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, Container, IconButton, Paper } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import ServiceIcon from '../components/ServiceIcon';
import { useAuth } from '../context/AuthContext';
import { useAccountErrorHandler } from '../hooks/useAccountErrorHandler';
import { fetchBillingStatus } from '../services/account';
import { type BusinessCharge, fetchAccountantExport, fetchBusinessMonth, setInvoiceFiled } from '../services/business';
import { daysFromToday } from '../utils/monthCharges';
import { saveFile } from '../utils/download';
import { safeManageUrl } from '../utils/manageUrl';
import { formatCurrency } from '../utils/money';
import { addMonths, quarterOf, yearMonthLabel, yearMonthOf } from '../utils/yearMonth';

/** How far back the server keeps the checklist (BusinessCharges::MAX_MONTHS_BACK). */
const MONTHS_BACK = 36;

const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const dueLabel = (date: string) => {
    const days = daysFromToday(date);
    return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
};

/**
 * The Business view's invoice checklist: a month's business charges, each ticked once its invoice is
 * saved or sent to the accountant, and the accountant export (paid).
 */
const InvoicesPage: React.FC = () => {
    const { token } = useAuth();
    const handleError = useAccountErrorHandler();
    const [currentMonth] = useState(() => yearMonthOf(new Date()));
    const [month, setMonth] = useState(currentMonth);
    // Kept with the month they belong to, so a change of month shows the spinner until its charges arrive.
    const [loaded, setLoaded] = useState<{ month: string; charges: BusinessCharge[] } | null>(null);
    const charges = loaded?.month === month ? loaded.charges : null;
    const [error, setError] = useState('');
    const [paidFeatures, setPaidFeatures] = useState<boolean | null>(null);
    const [exporting, setExporting] = useState<'month' | 'quarter' | null>(null);
    const [exportError, setExportError] = useState('');

    useEffect(() => {
        if (!token) return undefined;
        let active = true;
        fetchBusinessMonth(token, month)
            .then((data) => active && setLoaded({ month, charges: data.charges }))
            .catch((requestError: unknown) => {
                const message = handleError(requestError);
                if (active && message) setError(message);
            });
        return () => {
            active = false;
        };
    }, [token, month, handleError]);

    useEffect(() => {
        if (!token) return;
        // Unknown on failure: the export buttons stay, and the server answers if it isn't unlocked.
        fetchBillingStatus(token).then((status) => setPaidFeatures(status.paidFeatures)).catch(() => setPaidFeatures(null));
    }, [token]);

    const toggle = useCallback(async (charge: BusinessCharge, filed: boolean) => {
        if (!token) return;
        const update = (value: boolean) => setLoaded((current) => current && {
            ...current,
            charges: current.charges.map((item) => (
                item.subscriptionId === charge.subscriptionId && item.date === charge.date ? { ...item, invoiceFiled: value } : item
            )),
        });
        update(filed);
        setError('');
        try {
            await setInvoiceFiled(token, charge, filed);
        } catch (requestError) {
            update(!filed);
            const message = handleError(requestError);
            if (message) setError(message);
        }
    }, [token, handleError]);

    const changeMonth = (next: string) => {
        setError('');
        setMonth(next);
    };

    const quarter = quarterOf(month, currentMonth);
    const download = async (kind: 'month' | 'quarter') => {
        if (!token) return;
        setExporting(kind);
        setExportError('');
        try {
            const { blob, filename } = kind === 'month'
                ? await fetchAccountantExport(token, month, month)
                : await fetchAccountantExport(token, quarter.from, quarter.to);
            saveFile(blob, filename);
        } catch (requestError) {
            const message = handleError(requestError);
            if (message) setExportError(message);
        } finally {
            setExporting(null);
        }
    };

    const gone = charges?.filter((charge) => !charge.upcoming) ?? [];
    const filed = gone.filter((charge) => charge.invoiceFiled).length;
    const upcoming = (charges?.length ?? 0) - gone.length;
    const label = yearMonthLabel(month);

    return (
        <Box className="dashboard-page">
            <AppHeader />
            <Container className="dashboard-container invoices-page">
                <Box className="dashboard-heading">
                    <div>
                        <h1>Business invoices</h1>
                        <p>Tick each charge once its invoice is saved or sent to your accountant, so none is missing when you hand over the month.</p>
                    </div>
                    <Box className="dashboard-heading-actions">
                        <Button component={RouterLink} to="/my-subs" variant="outlined" color="inherit">Back to dashboard</Button>
                    </Box>
                </Box>

                <Paper className="month-summary invoices-month" component="section" aria-labelledby="invoices-month-title">
                    <div className="invoices-month-head">
                        <IconButton
                            aria-label="Previous month"
                            disabled={month <= addMonths(currentMonth, -MONTHS_BACK)}
                            onClick={() => changeMonth(addMonths(month, -1))}
                        >
                            <ChevronLeftRoundedIcon />
                        </IconButton>
                        <h2 id="invoices-month-title">{label}</h2>
                        <IconButton aria-label="Next month" disabled={month >= currentMonth} onClick={() => changeMonth(addMonths(month, 1))}>
                            <ChevronRightRoundedIcon />
                        </IconButton>
                        {charges && gone.length > 0 && (
                            <span className="invoices-progress" data-testid="invoices-progress">
                                {filed === gone.length ? `All ${gone.length} invoices filed` : `${filed} of ${gone.length} invoices filed`}
                            </span>
                        )}
                    </div>

                    {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}

                    {charges === null ? (
                        !error && <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}><CircularProgress size={26} /></Box>
                    ) : charges.length === 0 ? (
                        <p className="month-summary-empty">No business charges in {label}.</p>
                    ) : (
                        <ol className="month-charges invoices-list" aria-label={`Business charges in ${label}`}>
                            {charges.map((charge) => {
                                const billingPage = !charge.upcoming && !charge.invoiceFiled ? safeManageUrl(charge.manageUrl) : null;
                                return (
                                    <li key={`${charge.subscriptionId}-${charge.date}`} className={charge.invoiceFiled ? 'paid' : ''}>
                                        <span className="charge-date">{dayFormat.format(new Date(`${charge.date}T00:00:00`))}</span>
                                        <span className="charge-name-cell">
                                            <RouterLink className="charge-name" to={`/subscriptions/${charge.subscriptionId}`}>
                                                <ServiceIcon serviceName={charge.serviceName} size="sm" /><span>{charge.serviceName}</span>
                                            </RouterLink>
                                            {billingPage && (
                                                <a className="invoices-billing-link" href={billingPage} target="_blank" rel="noopener noreferrer">
                                                    Billing page<span className="visually-hidden"> of {charge.serviceName} (opens in a new tab)</span> ↗
                                                </a>
                                            )}
                                        </span>
                                        <span className="charge-amount">{formatCurrency(Number(charge.amount), charge.currency)}</span>
                                        <span className="charge-state">
                                            {charge.upcoming ? dueLabel(charge.date) : (
                                                <label className="invoices-tick">
                                                    <Checkbox
                                                        size="small"
                                                        checked={charge.invoiceFiled}
                                                        onChange={(event) => void toggle(charge, event.target.checked)}
                                                        inputProps={{ 'aria-label': `Invoice filed: ${charge.serviceName}, ${dayFormat.format(new Date(`${charge.date}T00:00:00`))}` }}
                                                    />
                                                    Invoice filed
                                                </label>
                                            )}
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                    <div className="month-summary-foot">
                        <span>
                            {upcoming > 0 && `${upcoming} still to come. `}
                            Estimated from each subscription’s billing date and price history. Personal subscriptions aren’t listed.
                        </span>
                    </div>
                </Paper>

                <Paper className="month-summary invoices-export" component="section" aria-labelledby="invoices-export-title">
                    <h2 id="invoices-export-title">Export for your accountant</h2>
                    <p>
                        A spreadsheet (CSV) of the business charges that have gone out: date, service, category, amount
                        in its own currency, payment method, and whether the invoice is filed.
                    </p>
                    {paidFeatures === false ? (
                        <p className="invoices-locked">
                            The export comes with the one-time unlock. <RouterLink to="/plans">See plans</RouterLink>
                        </p>
                    ) : (
                        <div className="invoices-export-actions">
                            <Button variant="contained" startIcon={<FileDownloadRoundedIcon />} disabled={exporting !== null} onClick={() => void download('month')}>
                                {exporting === 'month' ? 'Preparing...' : `Download ${label}`}
                            </Button>
                            <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} disabled={exporting !== null} onClick={() => void download('quarter')}>
                                {exporting === 'quarter' ? 'Preparing...' : `Download ${quarter.label}`}
                            </Button>
                        </div>
                    )}
                    {exportError && <Alert severity="error" sx={{ mt: 1.5 }}>{exportError}</Alert>}
                </Paper>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default InvoicesPage;
