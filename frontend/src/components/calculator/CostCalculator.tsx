import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, IconButton, MenuItem, Paper, Stack, TextField } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import { useNavigate } from 'react-router';
import CatalogTile from '../CatalogTile';
import CurrencySelect, { type Currency } from '../CurrencySelect';
import type { BillingInterval } from '../subscription-form/SubscriptionFormCard';
import { useAuth } from '../../context/AuthContext';
import type { CalculatorPreset } from '../../data/calculatorPresets';
import { type CatalogService, SERVICE_CATALOG, findCatalogService, searchCatalog } from '../../data/services';
import {
    CALCULATOR_CADENCES,
    CALCULATOR_CATEGORIES,
    type CalculatorRow,
    calculatorTotals,
    importFromRows,
    shareFragment,
    type SharedResult,
} from '../../utils/calculator';
import { formatCurrency } from '../../utils/money';
import { shareOrDownloadCard } from '../../utils/shareCard';

type Props = {
    preset: CalculatorPreset;
    initialRows?: CalculatorRow[];
    initialCurrency?: Currency;
};

const NAME_MAX = 80;

const whole = (amount: number, currency: string) => formatCurrency(amount, currency);

/**
 * The full calculator: pick services or type your own, price each one, and see the totals. State
 * lives in this component only; leaving the page forgets it unless the visitor saves it to an account.
 */
const CostCalculator: React.FC<Props> = ({ preset, initialRows = [], initialCurrency = 'EUR' }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState<CalculatorRow[]>(initialRows);
    const [currency, setCurrency] = useState<Currency>(initialCurrency);
    const [customName, setCustomName] = useState('');
    const [notice, setNotice] = useState('');

    const suggested = useMemo(
        () => preset.suggested.map((name) => SERVICE_CATALOG.find((service) => service.name === name)).filter((service): service is CatalogService => !!service),
        [preset],
    );
    const matches = query.trim() ? searchCatalog(query) : suggested;
    const totals = useMemo(() => calculatorTotals(rows), [rows]);
    const has = (name: string) => rows.some((row) => row.name.toLowerCase() === name.toLowerCase());

    const toggle = (service: CatalogService) => {
        setNotice('');
        setRows((previous) => has(service.name)
            ? previous.filter((row) => row.name !== service.name)
            : [...previous, { name: service.name, category: service.category, amount: '', cadence: service.cadence, included: true }]);
    };

    const update = (name: string, partial: Partial<CalculatorRow>) =>
        setRows((previous) => previous.map((row) => (row.name === name ? { ...row, ...partial } : row)));

    const addCustom = () => {
        const name = customName.trim().slice(0, NAME_MAX);
        if (!name) return;
        const known = findCatalogService(name);
        if (known) {
            if (!has(known.name)) toggle(known);
        } else if (!has(name)) {
            setRows((previous) => [...previous, { name, category: 'Other', amount: '', cadence: 'monthly', included: true }]);
        }
        setCustomName('');
    };

    const result: SharedResult = { yearly: totals.yearly, count: totals.count, currency, topCategory: totals.categories[0]?.category ?? null };
    const shareUrl = () => `${window.location.origin}/calculator#${shareFragment(result)}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl());
            setNotice('Link copied. It shows your totals only, never what you pay for.');
        } catch {
            setNotice(`Copy this link: ${shareUrl()}`);
        }
    };

    const shareCard = async () => {
        const outcome = await shareOrDownloadCard(result, shareUrl(), window.location.host);
        if (outcome === 'downloaded') setNotice('Image saved. It shows your totals only, never what you pay for.');
        if (outcome === 'unavailable') setNotice('This browser can’t make the image. Copy the link instead.');
    };

    const save = () => {
        const state = { calculatorImport: importFromRows(rows, currency) };
        navigate(isAuthenticated ? '/subscriptions/pick' : '/register', { state });
    };

    return (
        <div className="calculator">
            <Paper className="calculator-picker" elevation={0} component="section" aria-labelledby="calculator-picker-title">
                <h2 id="calculator-picker-title">What you pay for</h2>
                <TextField
                    type="search"
                    label="Search services"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    fullWidth
                    size="small"
                />
                {!query.trim() && <p className="calculator-hint">Common ones below; search for more.</p>}
                {matches.length === 0 ? (
                    <p className="calculator-hint">Not in the list. Add it below.</p>
                ) : (
                    <ul className="calculator-services" aria-label="Services">
                        {matches.map((service) => (
                            <li key={service.name}>
                                <label>
                                    <Checkbox size="small" checked={has(service.name)} onChange={() => toggle(service)} inputProps={{ 'aria-label': service.name }} />
                                    <CatalogTile service={service} />
                                    <span>{service.name}</span>
                                    <small>{service.category}</small>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}
                <Box
                    component="form"
                    className="calculator-custom"
                    onSubmit={(event) => {
                        event.preventDefault();
                        addCustom();
                    }}
                >
                    <TextField
                        label="Something else"
                        placeholder="e.g. Local gym"
                        size="small"
                        value={customName}
                        onChange={(event) => setCustomName(event.target.value)}
                        inputProps={{ maxLength: NAME_MAX }}
                        fullWidth
                    />
                    <Button type="submit" variant="outlined" disabled={!customName.trim()}>Add</Button>
                </Box>
            </Paper>

            <Paper className="calculator-rows" elevation={0} component="section" aria-labelledby="calculator-rows-title">
                <div className="calculator-rows-head">
                    <h2 id="calculator-rows-title">Your list · {rows.length}</h2>
                    <CurrencySelect value={currency} onChange={setCurrency} size="small" sx={{ maxWidth: 130 }} />
                </div>
                {rows.length === 0 ? (
                    <p className="calculator-hint">Tick a service or add your own, then type what you pay.</p>
                ) : (
                    <ul className="calculator-row-list">
                        {rows.map((row) => (
                            <li key={row.name} className={row.included ? '' : 'dropped'}>
                                <Checkbox
                                    size="small"
                                    checked={row.included}
                                    onChange={(event) => update(row.name, { included: event.target.checked })}
                                    inputProps={{ 'aria-label': `Count ${row.name}` }}
                                />
                                <span className="calculator-row-name">{row.name}</span>
                                <TextField
                                    label="Price"
                                    type="number"
                                    size="small"
                                    value={row.amount}
                                    onChange={(event) => update(row.name, { amount: event.target.value })}
                                    inputProps={{ min: 0, step: '0.01', 'aria-label': `${row.name} price` }}
                                />
                                <TextField
                                    select
                                    label="Billed"
                                    size="small"
                                    value={row.cadence}
                                    onChange={(event) => update(row.name, { cadence: event.target.value as BillingInterval })}
                                    SelectProps={{ inputProps: { 'aria-label': `${row.name} billing cadence` } }}
                                >
                                    {CALCULATOR_CADENCES.map((cadence) => <MenuItem key={cadence.value} value={cadence.value}>{cadence.label}</MenuItem>)}
                                </TextField>
                                {!findCatalogService(row.name) && (
                                    <TextField
                                        select
                                        label="Category"
                                        size="small"
                                        value={row.category}
                                        onChange={(event) => update(row.name, { category: event.target.value as CalculatorRow['category'] })}
                                        SelectProps={{ inputProps: { 'aria-label': `${row.name} category` } }}
                                    >
                                        {CALCULATOR_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                                    </TextField>
                                )}
                                <IconButton aria-label={`Remove ${row.name}`} size="small" onClick={() => setRows((previous) => previous.filter((item) => item.name !== row.name))}>
                                    <CloseRoundedIcon fontSize="small" />
                                </IconButton>
                            </li>
                        ))}
                    </ul>
                )}
                {rows.length > 0 && <p className="calculator-hint">Untick a row to see what dropping it would free up.</p>}
            </Paper>

            <Paper className="calculator-result" elevation={0} component="section" aria-labelledby="calculator-result-title" aria-live="polite">
                <h2 id="calculator-result-title">Your subscriptions cost</h2>
                <p className="calculator-yearly" data-testid="calculator-yearly">{whole(totals.yearly, currency)} <small>a year</small></p>
                <dl className="calculator-figures">
                    <div><dt>A month</dt><dd data-testid="calculator-monthly">{whole(totals.monthly, currency)}</dd></div>
                    <div><dt>Over 5 years</dt><dd data-testid="calculator-five-years">{whole(totals.fiveYears, currency)}</dd></div>
                    <div><dt>Counted</dt><dd>{totals.count}</dd></div>
                </dl>
                {totals.droppedCount > 0 && (
                    <p className="calculator-dropped" data-testid="calculator-dropped">
                        Dropping the {totals.droppedCount} unticked would free up to <strong>{whole(totals.droppedYearly, currency)}</strong> a year.
                    </p>
                )}
                {totals.categories.length > 0 && (
                    <ul className="calculator-categories" aria-label="By category">
                        {totals.categories.map((category) => (
                            <li key={category.category}>
                                <div><span>{category.category}</span><span>{whole(category.yearly, currency)} · {Math.round(category.share * 100)}%</span></div>
                                <span className="calculator-bar" aria-hidden="true"><span style={{ width: `${Math.max(category.share * 100, 2)}%` }} /></span>
                            </li>
                        ))}
                    </ul>
                )}
                {totals.count > 0 && (
                    <>
                        <Stack direction="row" spacing={1} className="calculator-share">
                            <Button variant="outlined" startIcon={<IosShareRoundedIcon />} onClick={() => void shareCard()}>Share result</Button>
                            <Button variant="text" startIcon={<LinkRoundedIcon />} onClick={() => void copyLink()}>Copy link</Button>
                        </Stack>
                        {notice && <Alert severity="info" sx={{ mt: 1.5 }}>{notice}</Alert>}
                        <div className="calculator-save">
                            <strong>Keep this list and get a reminder before each charge.</strong>
                            <Button variant="contained" onClick={save}>
                                {isAuthenticated ? `Add these ${totals.count} to my subscriptions` : 'Save it free'}
                            </Button>
                            {!isAuthenticated && <small>Free for up to 50 subscriptions. Your list comes with you when you sign up.</small>}
                        </div>
                    </>
                )}
            </Paper>
        </div>
    );
};

export default CostCalculator;
