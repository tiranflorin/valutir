import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Container,
    MenuItem,
    Paper,
    Stack,
    TextField,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useNavigate } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import CurrencySelect, { type Currency } from '../components/CurrencySelect';
import type { BillingInterval } from '../components/subscription-form/SubscriptionFormCard';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import CatalogTile from '../components/CatalogTile';
import { type CatalogService, SERVICE_CATALOG, searchCatalog } from '../data/services';
import { isBeforeToday, todayIsoDate } from '../utils/dates';
import './RecurringScreens.css';

type Row = { amount: string; cadence: BillingInterval; nextBillingDate: string };

const CADENCES: { value: BillingInterval; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
];

const isBusinessView = () => {
    try {
        return window.localStorage.getItem('valutir_dashboard_view') === 'business';
    } catch {
        return false;
    }
};

/**
 * "Pick what you pay for": tick common services, type what each costs and when it's next charged,
 * and add them all at once. Each one is its own POST, so the free-plan limit applies as usual.
 */
const PickServicesPage: React.FC = () => {
    const navigate = useNavigate();
    const { token, logout, user } = useAuth();
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, Row>>({});
    const [currency, setCurrency] = useState<Currency>((user?.defaultCurrency as Currency | undefined) ?? 'EUR');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const matches = useMemo(() => searchCatalog(query), [query]);
    const pickedServices = useMemo(
        () => picked.map((name) => SERVICE_CATALOG.find((service) => service.name === name)).filter((service): service is CatalogService => !!service),
        [picked]
    );

    const addLabel = pickedServices.length === 0
        ? 'Add subscriptions'
        : `Add ${pickedServices.length} subscription${pickedServices.length === 1 ? '' : 's'}`;

    const toggle = (service: CatalogService) => {
        setError('');
        if (picked.includes(service.name)) {
            setPicked(picked.filter((name) => name !== service.name));
            return;
        }
        setPicked([...picked, service.name]);
        setRows((previous) => previous[service.name]
            ? previous
            : { ...previous, [service.name]: { amount: '', cadence: service.cadence, nextBillingDate: '' } });
    };

    const updateRow = (name: string, partial: Partial<Row>) =>
        setRows((previous) => ({ ...previous, [name]: { ...previous[name], ...partial } }));

    const submit = async () => {
        const missing = pickedServices.find(({ name }) => !(Number(rows[name]?.amount) > 0) || !rows[name]?.nextBillingDate);
        if (missing) {
            setError(`Enter the price and next charge date for ${missing.name}.`);
            return;
        }
        const past = pickedServices.find(({ name }) => isBeforeToday(rows[name].nextBillingDate));
        if (past) {
            setError(`The next charge date for ${past.name} can't be in the past.`);
            return;
        }

        setSaving(true);
        setError('');
        const b2b = isBusinessView();
        let added = 0;
        try {
            for (const service of pickedServices) {
                const row = rows[service.name];
                const response = await fetch(`${API_URL}/api/subs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        serviceName: service.name,
                        amount: Number(row.amount),
                        currency,
                        billingCadence: row.cadence,
                        category: service.category,
                        status: 'active',
                        startedAt: todayIsoDate(),
                        nextBillingDate: row.nextBillingDate,
                        trialEndsAt: null,
                        notes: null,
                        paymentMethod: null,
                        manageUrl: service.manageUrl ?? null,
                        householdShared: false,
                        householdSize: null,
                        autoRenew: true,
                        b2b,
                        cancelledAt: null,
                        resumesOn: null,
                    }),
                });
                if (response.status === 401) {
                    logout();
                    navigate('/login', { replace: true });
                    return;
                }
                if (!response.ok) {
                    const data = await response.json().catch(() => null);
                    throw new Error(data?.message || `Could not add ${service.name}.`);
                }
                added += 1;
            }
            navigate('/my-subs');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Something went wrong.';
            // Drop the ones already saved, so trying again doesn't add them twice.
            setPicked((previous) => previous.slice(added));
            setError(added > 0 ? `Added ${added} of ${pickedServices.length}. ${message}` : message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box className="dashboard-page subscription-editor-page">
            <AppHeader />
            <Container className="dashboard-container subscription-editor-container pick-services-page">
                <Button component={RouterLink} to="/my-subs" variant="text" startIcon={<ArrowBackRoundedIcon />} className="subscription-back-link">
                    Back to subscriptions
                </Button>

                <Box className="subscription-editor-heading">
                    <h1>Pick what you pay for</h1>
                    <p>Tick the services you subscribe to, then add what each one costs you and when it’s next charged. You can change anything later.</p>
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
                    <Paper className="pick-services-list">
                        <TextField
                            type="search"
                            label="Search services"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        {matches.length === 0 ? (
                            <p className="pick-services-empty">Not in the list. <RouterLink to="/subscriptions/new">Add it yourself →</RouterLink></p>
                        ) : (
                            <ul aria-label="Common services">
                                {matches.map((service) => (
                                    <li key={service.name}>
                                        <label>
                                            <Checkbox
                                                size="small"
                                                checked={picked.includes(service.name)}
                                                onChange={() => toggle(service)}
                                                inputProps={{ 'aria-label': service.name }}
                                            />
                                            <CatalogTile service={service} />
                                            <span className="pick-services-name">{service.name}</span>
                                            <small>{service.category}</small>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Paper>

                    <Paper className="pick-services-selected" component="section" aria-labelledby="pick-selected-title">
                        <h2 id="pick-selected-title">Selected · {pickedServices.length}</h2>
                        {pickedServices.length === 0 ? (
                            <p className="pick-services-empty">Nothing picked yet.</p>
                        ) : (
                            <Stack spacing={2}>
                                <CurrencySelect value={currency} onChange={setCurrency} size="small" helperText="Used for all of these" />
                                {pickedServices.map((service) => (
                                    <fieldset key={service.name} className="pick-services-row">
                                        <legend>{service.name}</legend>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                                            <TextField
                                                label="Price"
                                                type="number"
                                                size="small"
                                                required
                                                value={rows[service.name]?.amount ?? ''}
                                                onChange={(event) => updateRow(service.name, { amount: event.target.value })}
                                                inputProps={{ min: 0, step: '0.01', 'aria-label': `${service.name} price` }}
                                            />
                                            <TextField
                                                select
                                                label="Billed"
                                                size="small"
                                                value={rows[service.name]?.cadence ?? service.cadence}
                                                onChange={(event) => updateRow(service.name, { cadence: event.target.value as BillingInterval })}
                                                SelectProps={{ inputProps: { 'aria-label': `${service.name} billing cadence` } }}
                                            >
                                                {CADENCES.map((cadence) => <MenuItem key={cadence.value} value={cadence.value}>{cadence.label}</MenuItem>)}
                                            </TextField>
                                            <TextField
                                                label="Next charge"
                                                type="date"
                                                size="small"
                                                required
                                                value={rows[service.name]?.nextBillingDate ?? ''}
                                                onChange={(event) => updateRow(service.name, { nextBillingDate: event.target.value })}
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ min: todayIsoDate(), 'aria-label': `${service.name} next charge` }}
                                            />
                                        </Stack>
                                    </fieldset>
                                ))}
                            </Stack>
                        )}
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                        <Button
                            variant="contained"
                            className="add-subscription"
                            sx={{ mt: 2 }}
                            fullWidth
                            disabled={saving || pickedServices.length === 0}
                            onClick={() => void submit()}
                        >
                            {saving ? 'Adding...' : addLabel}
                        </Button>
                    </Paper>
                </Stack>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default PickServicesPage;
