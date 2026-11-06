import React, { useMemo, useState } from 'react';
import { Box, CircularProgress, Paper } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Link as RouterLink } from 'react-router';
import { type ChargeSource, daysFromToday, monthCharges } from '../utils/monthCharges';
import { formatCurrency, groupedMoney } from '../utils/money';

/** Charges listed before "Show all" (weekly subscriptions can add four or five each). */
const COLLAPSED_COUNT = 6;

type MonthSummaryCardProps = {
    /** Non-cancelled subscriptions of the current view. */
    subscriptions: ChargeSource[];
    /** The amount one charge counts for (the full bill or the user's share). */
    amountFor?: (subscription: ChargeSource) => number;
    /** Shown in the card's header, e.g. the monthly average and a link to Insights. */
    summary?: React.ReactNode;
    now?: Date;
};

const dueLabel = (date: string, now: Date) => {
    const days = daysFromToday(date, now);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
};

/** This month's charges: what has gone out, what is left to pay, and the dated list. */
const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ subscriptions, amountFor, summary, now: nowProp }) => {
    const [expanded, setExpanded] = useState(false);
    // Fixed for the page's lifetime so the charges aren't recomputed on every render.
    const [mountedAt] = useState(() => new Date());
    const now = nowProp ?? mountedAt;
    const charges = useMemo(() => monthCharges(subscriptions, amountFor, now), [subscriptions, amountFor, now]);
    const paid = charges.filter((charge) => charge.paid);
    const left = charges.filter((charge) => !charge.paid);
    const month = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(now);
    const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
    const shown = expanded ? charges : charges.slice(0, COLLAPSED_COUNT);
    // By count, not amount: totals in different currencies can't be added up.
    const progress = charges.length ? Math.round((paid.length / charges.length) * 100) : 0;

    return (
        <Paper className="month-summary" component="section" aria-labelledby="month-summary-title">
            <div className="month-summary-head">
                <h2 id="month-summary-title">This month · {month}</h2>
                {summary && <span className="month-summary-average" data-testid="month-average">{summary}</span>}
            </div>

            <div className="month-summary-body">
                <div className="month-summary-totals">
                    <div>
                        <span className="metric-label">Left to pay</span>
                        <div className="metric-value" data-testid="month-left">{groupedMoney(left, (charge) => charge.amount)}</div>
                        <div className="metric-hint">{left.length} charge{left.length === 1 ? '' : 's'} to come</div>
                    </div>
                    <Box
                        className="month-summary-ring"
                        role="img"
                        aria-label={`${paid.length} of ${charges.length} charges this month have gone out`}
                    >
                        <CircularProgress variant="determinate" value={100} size={88} thickness={5} className="ring-track" />
                        <CircularProgress variant="determinate" value={progress} size={88} thickness={5} className="ring-value" />
                        <span className="ring-label">{paid.length}/{charges.length}</span>
                    </Box>
                    <div>
                        <span className="metric-label">Paid so far</span>
                        <div className="metric-value" data-testid="month-paid">{groupedMoney(paid, (charge) => charge.amount)}</div>
                        <div className="metric-hint">{paid.length} charge{paid.length === 1 ? '' : 's'} gone out</div>
                    </div>
                </div>

                {charges.length === 0 ? (
                    <p className="month-summary-empty">No charges this month.</p>
                ) : (
                    <ol className="month-charges" aria-label={`Charges in ${month}`}>
                        {shown.map((charge) => (
                            <li key={`${charge.subscriptionId}-${charge.date}`} className={charge.paid ? 'paid' : ''}>
                                <span className="charge-date">{dayFormat.format(new Date(`${charge.date}T00:00:00`))}</span>
                                <RouterLink className="charge-name" to={`/subscriptions/${charge.subscriptionId}`}>{charge.serviceName}</RouterLink>
                                <span className="charge-amount">{formatCurrency(charge.amount, charge.currency)}</span>
                                <span className="charge-state">
                                    {charge.paid
                                        ? <><CheckRoundedIcon fontSize="inherit" aria-hidden="true" /> Paid</>
                                        : dueLabel(charge.date, now)}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
                <div className="month-summary-foot">
                    {charges.length > COLLAPSED_COUNT && (
                        <button type="button" className="month-charges-toggle" onClick={() => setExpanded((value) => !value)}>
                            {expanded ? 'Show fewer' : `Show all ${charges.length} charges`}
                        </button>
                    )}
                    <span>Estimated from each subscription’s billing date</span>
                </div>
            </div>
        </Paper>
    );
};

export default MonthSummaryCard;
