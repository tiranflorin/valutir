import React, { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    Stack,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import LockClockOutlinedIcon from '@mui/icons-material/LockClockOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import AppSurfaceCard from '../components/AppSurfaceCard';
import CurrencySelect from '../components/CurrencySelect';
import { useAuth } from '../context/AuthContext';

type BillingInterval = 'monthly' | 'yearly' | 'quarterly' | 'weekly';
type SubscriptionStatus = 'Active' | 'Trial' | 'Other';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const intervalOptions: { label: string; value: BillingInterval }[] = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Weekly', value: 'weekly' },
];

const categoryOptions = [
    'Entertainment',
    'Software',
    'Fitness',
    'Banking',
    'Utilities',
    'Cloud',
    'Other',
];

const statusOptions: SubscriptionStatus[] = ['Active', 'Trial', 'Other'];

const requiredFieldSx = {
    '& .MuiFormLabel-asterisk': {
        color: 'error.main',
    },
};

const AddSubscriptionPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    const [serviceName, setServiceName] = useState('');
    const [amount, setAmount] = useState('15.99');
    const [currency, setCurrency] = useState('EUR');
    const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
    const [renewalDate, setRenewalDate] = useState('');
    const [category, setCategory] = useState('Entertainment');
    const [status, setStatus] = useState<SubscriptionStatus>('Active');
    const [notes, setNotes] = useState('');
    const [providerGroup, setProviderGroup] = useState('');
    const [householdShared, setHouseholdShared] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isTrial = status === 'Trial';
    const isOther = status === 'Other';
    const parsedAmount = Number(amount) || 0;

    const normalized = useMemo(() => {
        if (billingInterval === 'monthly') {
            return {
                monthly: parsedAmount,
                yearly: parsedAmount * 12,
            };
        }

        if (billingInterval === 'yearly') {
            return {
                monthly: parsedAmount / 12,
                yearly: parsedAmount,
            };
        }

        if (billingInterval === 'quarterly') {
            return {
                monthly: parsedAmount / 3,
                yearly: parsedAmount * 4,
            };
        }

        return {
            monthly: (parsedAmount * 52) / 12,
            yearly: parsedAmount * 52,
        };
    }, [billingInterval, parsedAmount]);

    const statusPayload = useMemo(() => {
        if (status === 'Trial') return 'trial';
        if (status === 'Other') return 'other';
        return 'active';
    }, [status]);

    const billingDateLabel = isTrial ? 'First charge date' : 'Next billing date';

    const billingDateHelperText = isTrial
        ? 'For trial subscriptions, this is the first day you will be charged.'
        : 'Select the next date this subscription is expected to renew.';

    const summaryDateLabel = isTrial ? 'First charge' : 'Next billing';

    const trialReminderPreview = useMemo(() => {
        if (!isTrial || !renewalDate) return null;

        const chargeDate = new Date(`${renewalDate}T12:00:00`);
        if (Number.isNaN(chargeDate.getTime())) return null;

        const reminderDate = new Date(chargeDate);
        reminderDate.setDate(reminderDate.getDate() - 2);

        return reminderDate.toISOString().slice(0, 10);
    }, [isTrial, renewalDate]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!token) {
            setError('You are not authenticated.');
            return;
        }

        if (!serviceName.trim()) {
            setError('Service name is required.');
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setError('Price must be greater than 0.');
            return;
        }

        if (!renewalDate) {
            setError(`${billingDateLabel} is required.`);
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const today = new Date().toISOString().slice(0, 10);

            const payload = {
                serviceName: serviceName.trim(),
                amount: Number(amount),
                currency,
                billingCadence: billingInterval,
                category,
                status: statusPayload,
                startedAt: today,
                nextBillingDate: renewalDate,
                trialEndsAt: isTrial ? renewalDate : null,
                trialReminderSentAt: null,
                notes: notes.trim() || null,
                paymentMethod: providerGroup.trim() || null,
                householdShared,
                autoRenew: !isOther,
                cancelledAt: isOther ? today : null,
            };

            const response = await fetch(`${API_BASE}/api/subs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                logout();
                navigate('/login', { replace: true });
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to create subscription.');
            }

            navigate('/my-subs');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AppShell mode="content" maxWidth="lg">
            <AppHeader />
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 1200,
                    mx: 'auto',
                    px: { xs: 2, md: 3 },
                    py: { xs: 3, md: 4 },
                }}
            >
                <Stack spacing={3}>
                    <Button
                        component={RouterLink}
                        to="/my-subs"
                        startIcon={<ArrowBackRoundedIcon />}
                        variant="text"
                        sx={{ alignSelf: 'flex-start', borderRadius: 999, fontWeight: 700 }}
                    >
                        Back to My Subs
                    </Button>

                    <Stack spacing={1}>
                        <Typography variant="h4" fontWeight={800}>
                            Add subscription
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Add the essentials first. Optional details stay hidden until you need them.
                        </Typography>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    {/*<Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">*/}
                        <AppSurfaceCard
                            sx={{
                                flex: 1.2,
                                width: '100%',
                                p: { xs: 2.5, md: 3 },
                                borderRadius: 4,
                            }}
                        >
                            <Box component="form" onSubmit={handleSubmit}>
                                <Stack spacing={3}>
                                    <Stack spacing={1}>
                                        <Typography variant="h6" fontWeight={800}>
                                            Core details
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Fields marked with * are required.
                                        </Typography>
                                    </Stack>

                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: { xs: 'column', md: 'row' },
                                            gap: { xs: 2, md: 2.5 },
                                            alignItems: { xs: 'stretch', md: 'flex-start' },
                                            width: '100%',
                                        }}
                                    >
                                        <Box sx={{ flex: { md: '1 1 0%' }, minWidth: 0 }}>
                                            <TextField
                                                required
                                                label="Service name"
                                                placeholder="Netflix, Spotify, Google One..."
                                                fullWidth
                                                value={serviceName}
                                                onChange={(e) => setServiceName(e.target.value)}
                                                sx={requiredFieldSx}
                                            />
                                        </Box>

                                        <Box
                                            sx={{
                                                width: { xs: '100%', sm: '100%', md: 200 },
                                                flexShrink: 0,
                                            }}
                                        >
                                            <TextField
                                                required
                                                label="Price"
                                                type="number"
                                                fullWidth
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                inputProps={{ min: 0, step: '0.01' }}
                                                sx={requiredFieldSx}
                                            />
                                        </Box>

                                        <Box
                                            sx={{
                                                width: { xs: '100%', sm: '100%', md: 140 },
                                                flexShrink: 0,
                                            }}
                                        >
                                            <CurrencySelect
                                                value={currency}
                                                onChange={setCurrency}
                                                sx={{
                                                    width: '100%',
                                                    minWidth: 0,
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Billing cadence
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            {intervalOptions.map((option) => (
                                                <Chip
                                                    key={option.value}
                                                    label={option.label}
                                                    clickable
                                                    color={billingInterval === option.value ? 'primary' : 'default'}
                                                    variant={billingInterval === option.value ? 'filled' : 'outlined'}
                                                    onClick={() => setBillingInterval(option.value)}
                                                    sx={{ fontWeight: 600, borderRadius: 999 }}
                                                />
                                            ))}
                                        </Stack>
                                    </Stack>

                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Category
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            {categoryOptions.map((option) => (
                                                <Chip
                                                    key={option}
                                                    label={option}
                                                    clickable
                                                    color={category === option ? 'primary' : 'default'}
                                                    variant={category === option ? 'filled' : 'outlined'}
                                                    onClick={() => setCategory(option)}
                                                    sx={{ fontWeight: 600, borderRadius: 999 }}
                                                />
                                            ))}
                                        </Stack>
                                    </Stack>

                                    <Stack spacing={1.5}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Status
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            {statusOptions.map((option) => (
                                                <Chip
                                                    key={option}
                                                    label={option}
                                                    clickable
                                                    color={status === option ? 'primary' : 'default'}
                                                    variant={status === option ? 'filled' : 'outlined'}
                                                    onClick={() => setStatus(option)}
                                                    sx={{ fontWeight: 600, borderRadius: 999 }}
                                                />
                                            ))}
                                        </Stack>

                                        {isTrial && (
                                            <Alert
                                                severity="info"
                                                icon={<LockClockOutlinedIcon fontSize="inherit" />}
                                                sx={{ borderRadius: 3 }}
                                            >
                                                This subscription is currently in a trial period. The selected date below
                                                will be treated as the first day the user will be charged.
                                            </Alert>
                                        )}

                                        {isOther && (
                                            <Alert severity="warning" sx={{ borderRadius: 3 }}>
                                                “Other” is treated as non-active in the current flow and may be saved as
                                                cancelled/inactive depending on backend rules.
                                            </Alert>
                                        )}
                                    </Stack>

                                    <TextField
                                        label={billingDateLabel}
                                        type="date"
                                        value={renewalDate}
                                        onChange={(e) => setRenewalDate(e.target.value)}
                                        fullWidth
                                        required
                                        helperText={billingDateHelperText}
                                        InputLabelProps={{ shrink: true }}
                                        sx={requiredFieldSx}
                                    />

                                    {isTrial && (
                                        <Alert
                                            severity="warning"
                                            icon={<NotificationsActiveOutlinedIcon fontSize="inherit" />}
                                            sx={{ borderRadius: 3 }}
                                        >
                                            Trial reminder: you should be warned before this date so you know a
                                            paid renewal is coming.
                                            {trialReminderPreview
                                                ? ` Planned reminder target: ${trialReminderPreview}.`
                                                : ' Select a first charge date to preview the reminder timing.'}
                                        </Alert>
                                    )}

                                    <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent' }}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreRoundedIcon />}
                                            sx={{ px: 0, minHeight: 'unset' }}
                                        >
                                            <Stack spacing={0.25}>
                                                <Typography fontWeight={800}>Optional details</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Add extra context only if it helps you later.
                                                </Typography>
                                            </Stack>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ px: 0, pt: 1 }}>
                                            <Stack spacing={2.5}>
                                                <TextField
                                                    label="Payment method / provider group"
                                                    value={providerGroup}
                                                    onChange={(e) => setProviderGroup(e.target.value)}
                                                    fullWidth
                                                />

                                                <TextField
                                                    label="Notes"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    fullWidth
                                                    multiline
                                                    minRows={4}
                                                />

                                                <Stack
                                                    direction={{ xs: 'column', sm: 'row' }}
                                                    spacing={1.5}
                                                    alignItems={{ xs: 'stretch', sm: 'center' }}
                                                    justifyContent="space-between"
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 3,
                                                        border: `1px solid ${theme.palette.divider}`,
                                                        bgcolor: theme.palette.background.default,
                                                    }}
                                                >
                                                    <Stack spacing={0.25}>
                                                        <Typography fontWeight={700}>Household shared</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Mark this if the subscription is shared with family or household
                                                            members.
                                                        </Typography>
                                                    </Stack>

                                                    <Button
                                                        type="button"
                                                        variant={householdShared ? 'contained' : 'outlined'}
                                                        onClick={() => setHouseholdShared((prev) => !prev)}
                                                        sx={{ fontWeight: 600, minWidth: 160 }}
                                                    >
                                                        {householdShared ? 'Shared' : 'Not shared'}
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </AccordionDetails>
                                    </Accordion>

                                    <Divider />

                                    <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}>
                                        <Button
                                            component={RouterLink}
                                            to="/my-subs"
                                            variant="outlined"
                                            color="inherit"
                                            fullWidth
                                            sx={{ fontWeight: 700 }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            fullWidth
                                            disabled={submitting}
                                            sx={{ fontWeight: 700 }}
                                        >
                                            {submitting ? 'Saving...' : 'Save subscription'}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        </AppSurfaceCard>

                        <AppSurfaceCard
                            sx={{
                                flex: 0.8,
                                width: '100%',
                                p: { xs: 2.5, md: 3 },
                                borderRadius: 4,
                                position: { lg: 'sticky' },
                                top: { lg: 96 },
                            }}
                        >
                            <Stack spacing={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <InfoOutlinedIcon color="primary" fontSize="small" />
                                    <Typography variant="h6" fontWeight={800}>
                                        Live summary
                                    </Typography>
                                </Stack>

                                <Divider />

                                <Stack spacing={1.5}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Service
                                        </Typography>
                                        <Typography fontWeight={700}>
                                            {serviceName || 'Untitled subscription'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Status
                                        </Typography>
                                        <Typography fontWeight={700}>{status}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Normalized monthly
                                        </Typography>
                                        <Typography fontWeight={700}>
                                            {normalized.monthly.toFixed(2)} {currency}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Normalized yearly
                                        </Typography>
                                        <Typography fontWeight={700}>
                                            {normalized.yearly.toFixed(2)} {currency}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {summaryDateLabel}
                                        </Typography>
                                        <Typography fontWeight={700}>
                                            {renewalDate || 'Not selected yet'}
                                        </Typography>
                                    </Box>
                                </Stack>

                                {isTrial && (
                                    <>
                                        <Divider />
                                        <Stack spacing={1.25}>
                                            <Chip
                                                label="Trial-aware reminder flow"
                                                color="warning"
                                                variant="outlined"
                                                sx={{ alignSelf: 'flex-start', fontWeight: 700, borderRadius: 999 }}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                This subscription is treated as a free trial for the UI flow. The selected
                                                date represents the first paid charge.
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Reminder preview:{' '}
                                                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                    {trialReminderPreview || 'Choose a first charge date'}
                                                </Box>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Planned email step: send a remainder via email 2 days before trial expiration.
                                            </Typography>
                                        </Stack>
                                    </>
                                )}
                            </Stack>
                        </AppSurfaceCard>
                    {/*</Stack>*/}
                </Stack>
            </Box>
        </AppShell>
    );
};

export default AddSubscriptionPage;