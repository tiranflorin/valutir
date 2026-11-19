import React, { useMemo, useState } from 'react';
import { Button, InputAdornment, TextField } from '@mui/material';
import { useNavigate } from 'react-router';
import CatalogTile from '../CatalogTile';
import PriceStepButtons from '../PriceStepButtons';
import { hideNumberSpinners, priceStepKeyDown } from '../../utils/stepPrice';
import type { BillingInterval } from '../subscription-form/SubscriptionFormCard';
import { SERVICE_CATALOG, type CatalogService } from '../../data/services';
import { CALCULATOR_CADENCES, type CalculatorRow, calculatorTotals, priceOf } from '../../utils/calculator';
import { formatCurrency } from '../../utils/money';
import { renewalReminderLeadDays } from '../../utils/reminders';

const WALL_SERVICES = [
    'Netflix', 'Spotify', 'YouTube Premium', 'Disney+',
    'Amazon Prime', 'HBO Max', 'Apple TV+', 'Audible',
    'iCloud+', 'Google One', 'ChatGPT Plus', 'Claude Pro',
    'Microsoft 365', 'PlayStation Plus', 'Duolingo Super', 'NordVPN',
];

/** Which of the next 12 months a quarterly or yearly charge comes first (0 = next month). */
type FirstMonths = Record<string, number>;

/** The next 12 calendar months, starting with next month. */
const nextTwelveMonths = (today: Date): Date[] =>
    Array.from({ length: 12 }, (_, index) => new Date(today.getFullYear(), today.getMonth() + 1 + index, 1));

/** What each of the next 12 months charges; weekly prices are spread evenly, so the months add up to the yearly total. */
const monthlyCharges = (rows: CalculatorRow[], firstMonths: FirstMonths): number[] => {
    const months = Array<number>(12).fill(0);
    rows.filter((row) => row.included).forEach((row) => {
        const price = priceOf(row);
        const first = firstMonths[row.name] ?? 0;
        months.forEach((_, index) => {
            if (row.cadence === 'monthly') months[index] += price;
            else if (row.cadence === 'weekly') months[index] += (price * 52) / 12;
            else if (row.cadence === 'quarterly' && (index - first + 12) % 3 === 0) months[index] += price;
            else if (row.cadence === 'yearly' && index === first) months[index] += price;
        });
    });
    return months;
};

const monthName = (date: Date, style: 'short' | 'long') => date.toLocaleString('en-GB', { month: style });

/** A reminder email as ValuTir sends it (subject and body mirror email/reminder_digest.html.twig). */
const ReminderPreview: React.FC<{ rows: CalculatorRow[] }> = ({ rows }) => {
    // The visitor's own largest charge, or a labelled example before they type a price.
    const largest = rows.filter((row) => row.included && priceOf(row) > 0).sort((a, b) => priceOf(b) - priceOf(a))[0];
    const lead = largest ? renewalReminderLeadDays(largest.cadence) : 2;
    const amount = largest ? formatCurrency(priceOf(largest), 'EUR') : formatCurrency(29, 'EUR');
    const subject = largest ? `${largest.name} renews in ${lead} days: ${amount}` : 'Your gym trial ends in 2 days';

    return (
        <figure className="hero-reminder" aria-label="Example of a reminder email">
            <div className="hero-reminder-head">
                <span className="hero-reminder-from">ValuTir</span>
                {!largest && <span className="hero-reminder-tag">Example</span>}
            </div>
            <strong className="hero-reminder-subject">{subject}</strong>
            <div className="hero-reminder-item">
                <span>
                    <b>{largest ? largest.name : 'Gym membership'}</b>
                    <small>{largest ? `Renews in ${lead} days` : 'Trial ends in 2 days, then the first charge'}</small>
                </span>
                <span className="hero-reminder-amount">{amount}</span>
            </div>
            <figcaption>
                Sent {largest ? `${lead} ${lead === 1 ? 'day' : 'days'} before each ${largest.cadence} charge` : '2 days before a trial ends, 3 before a monthly charge, 7 before a yearly one'}.
            </figcaption>
        </figure>
    );
};

/**
 * The home page hero's interactive half: tap services on the icon wall, type their prices, and
 * see the yearly total, which of the next 12 months the charges land in, and the reminder email
 * that would come before the largest one. Everything stays in the browser; "Open the full
 * calculator" takes the list along in router state.
 */
const HeroCalculator: React.FC<{ intro: React.ReactNode; actions: React.ReactNode }> = ({ intro, actions }) => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<CalculatorRow[]>([]);
    const [firstMonths, setFirstMonths] = useState<FirstMonths>({});
    const services = useMemo(
        () => WALL_SERVICES.map((name) => SERVICE_CATALOG.find((service) => service.name === name)).filter((service): service is CatalogService => !!service),
        [],
    );
    const months = useMemo(() => nextTwelveMonths(new Date()), []);
    const totals = calculatorTotals(rows);
    const charges = monthlyCharges(rows, firstMonths);
    const highest = Math.max(...charges);
    const peak = charges.indexOf(highest);
    // Name the biggest month only when the months differ, so a list of monthly plans doesn't get a false spike.
    const uneven = highest > 0 && charges.some((amount) => Math.abs(amount - highest) > 0.005);
    const picked = (name: string) => rows.some((row) => row.name === name);

    const update = (name: string, change: Partial<CalculatorRow>) =>
        setRows((previous) => previous.map((row) => (row.name === name ? { ...row, ...change } : row)));

    const toggle = (service: CatalogService) => setRows((previous) => picked(service.name)
        ? previous.filter((row) => row.name !== service.name)
        : [...previous, { name: service.name, category: service.category, amount: '', cadence: service.cadence, included: true }]);

    return (
        <section className="landing-hero" id="top">
            <div className="hero-copy-block">
                {intro}
                <div className="hero-wall" role="group" aria-label="Popular services">
                    {services.map((service) => (
                        <button
                            key={service.name}
                            type="button"
                            className={picked(service.name) ? 'selected' : ''}
                            aria-pressed={picked(service.name)}
                            onClick={() => toggle(service)}
                        >
                            <CatalogTile service={service} />
                            <span>{service.name}</span>
                        </button>
                    ))}
                </div>
                {rows.length > 0 && (
                    <ul className="hero-calculator-rows">
                        {rows.map((row) => (
                            <li key={row.name}>
                                <span>{row.name}</span>
                                <TextField
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={row.amount}
                                    onChange={(event) => update(row.name, { amount: event.target.value })}
                                    onKeyDown={priceStepKeyDown(row.amount, (amount) => update(row.name, { amount }))}
                                    inputProps={{ min: 0, step: '0.01', 'aria-label': `${row.name} price in euros` }}
                                    // The quick calculator is in euros; the full one lets you pick the currency.
                                    // disableTypography: plain text, not a <p> (the hero's paragraph margin would push it up).
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start" disableTypography>€</InputAdornment>,
                                        endAdornment: <PriceStepButtons value={row.amount} onChange={(amount) => update(row.name, { amount })} />,
                                    }}
                                    sx={hideNumberSpinners}
                                />
                                <select
                                    className="hero-row-select"
                                    value={row.cadence}
                                    onChange={(event) => update(row.name, { cadence: event.target.value as BillingInterval })}
                                    aria-label={`${row.name} billing cadence`}
                                >
                                    {CALCULATOR_CADENCES.map((cadence) => <option key={cadence.value} value={cadence.value}>{cadence.label}</option>)}
                                </select>
                                {(row.cadence === 'yearly' || row.cadence === 'quarterly') && (
                                    <label className="hero-row-month">
                                        Next charge
                                        <select
                                            className="hero-row-select"
                                            value={firstMonths[row.name] ?? 0}
                                            onChange={(event) => setFirstMonths((previous) => ({ ...previous, [row.name]: Number(event.target.value) }))}
                                            aria-label={`${row.name} next charge`}
                                        >
                                            {months.map((month, index) => (
                                                <option key={month.toISOString()} value={index}>{monthName(month, 'long')} {month.getFullYear()}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {actions}
            </div>

            <aside className="hero-year" aria-labelledby="hero-year-title">
                <h2 id="hero-year-title">Your next 12 months</h2>
                <div className="hero-year-total" aria-live="polite">
                    <strong data-testid="hero-yearly">{formatCurrency(totals.yearly, 'EUR')}</strong>
                    <small>{formatCurrency(totals.monthly, 'EUR')} a month on average · {formatCurrency(totals.fiveYears, 'EUR')} over 5 years</small>
                </div>
                <ol className={`hero-year-bars${highest > 0 ? '' : ' empty'}`} aria-label="Charges by month">
                    {months.map((month, index) => (
                        <li
                            key={month.toISOString()}
                            className={uneven && index === peak ? 'peak' : ''}
                        >
                            <span
                                className="hero-year-bar"
                                style={{ height: highest > 0 ? `${Math.max(4, (charges[index] / highest) * 100)}%` : undefined }}
                            >
                                {/* Read out by screen readers; shown above the bar on hover once there is a price. */}
                                <span className="hero-year-tip">{monthName(month, 'long')}: {formatCurrency(charges[index], 'EUR')}</span>
                            </span>
                            <span className="hero-year-month" aria-hidden="true">{monthName(month, 'short').charAt(0)}</span>
                        </li>
                    ))}
                </ol>
                <p className="hero-year-note" data-testid="hero-peak">
                    {highest === 0
                        ? 'Tap a service and type its price to see which months the charges land in.'
                        : uneven
                            ? `Biggest month: ${monthName(months[peak], 'long')}, ${formatCurrency(highest, 'EUR')}.`
                            : `${formatCurrency(highest, 'EUR')} every month.`}
                </p>
                <ReminderPreview rows={rows} />
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate('/calculator', { state: { calculatorRows: rows, calculatorCurrency: 'EUR' } })}
                >
                    {rows.length > 0 ? 'Add the rest in the full calculator' : 'Open the full calculator'} →
                </Button>
            </aside>
        </section>
    );
};

export default HeroCalculator;
