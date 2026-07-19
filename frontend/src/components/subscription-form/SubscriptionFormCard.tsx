import React, { useMemo } from 'react';
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
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CurrencySelect from '../CurrencySelect';
import AppSurfaceCard from '../AppSurfaceCard';

export type BillingInterval = 'monthly' | 'yearly' | 'quarterly' | 'weekly';
export type SubscriptionStatus = 'Active' | 'Trial' | 'Other';

export type SubscriptionFormValues = {
    serviceName: string;
    amount: string;
    currency: string;
    billingInterval: BillingInterval;
    renewalDate: string;
    category: string;
    status: SubscriptionStatus;
    notes: string;
    providerGroup: string;
    householdShared: boolean;
    autoRenew: boolean;
};

type Props = {
    title: string;
    description: string;
    values: SubscriptionFormValues;
    onChange: (next: SubscriptionFormValues) => void;
    error?: string;
    submitting?: boolean;
    submitLabel: string;
    onSubmit: () => void;
    onCancel: () => void;
    showCurrency?: boolean;
    showProviderGroup?: boolean;
    showHouseholdShared?: boolean;
};

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

const SubscriptionFormCard: React.FC<Props> = ({
                                                   title,
                                                   description,
                                                   values,
                                                   onChange,
                                                   error = '',
                                                   submitting = false,
                                                   submitLabel,
                                                   onSubmit,
                                                   onCancel,
                                                   showCurrency = true,
                                                   showProviderGroup = true,
                                                   showHouseholdShared = true,
                                               }) => {
    const theme = useTheme();

    const isTrial = values.status === 'Trial';
    const isOther = values.status === 'Other';
    const parsedAmount = Number(values.amount) || 0;

    const normalized = useMemo(() => {
        if (values.billingInterval === 'monthly') {
            return {
                monthly: parsedAmount,
                yearly: parsedAmount * 12,
            };
        }

        if (values.billingInterval === 'yearly') {
            return {
                monthly: parsedAmount / 12,
                yearly: parsedAmount,
            };
        }

        if (values.billingInterval === 'quarterly') {
            return {
                monthly: parsedAmount / 3,
                yearly: parsedAmount * 4,
            };
        }

        return {
            monthly: (parsedAmount * 52) / 12,
            yearly: parsedAmount * 52,
        };
    }, [parsedAmount, values.billingInterval]);

    const billingDateLabel = isTrial ? 'First charge date' : 'Next billing date';

    const billingDateHelperText = isTrial
        ? 'For trial subscriptions, this is the first day you will be charged.'
        : 'Select the next date this subscription is expected to renew.';

    const summaryDateLabel = isTrial ? 'First charge' : 'Next billing';

    const trialReminderPreview = useMemo(() => {
        if (!isTrial || !values.renewalDate) return null;

        const chargeDate = new Date(`${values.renewalDate}T12:00:00`);
        if (Number.isNaN(chargeDate.getTime())) return null;

        const reminderDate = new Date(chargeDate);
        reminderDate.setDate(reminderDate.getDate() - 2);

        return reminderDate.toISOString().slice(0, 10);
    }, [isTrial, values.renewalDate]);

    const patch = (partial: Partial<SubscriptionFormValues>) => {
        onChange({ ...values, ...partial });
    };

    return (
        <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={3}
            alignItems="flex-start"
            sx={{ width: '100%' }}
        >
            <AppSurfaceCard
                sx={{
                    flex: 1.38,
                    width: '100%',
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 2,
                }}
            >
                <Box
                    component="form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <Stack spacing={3}>
                        <Stack spacing={0.75}>
                            <Typography variant="h6" fontWeight={800}>
                                {title}
                            </Typography>
                            <Typography color="text.secondary">{description}</Typography>
                        </Stack>

                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 3 }}>
                                {error}
                            </Alert>
                        )}

                        <Stack spacing={0.5}>
                            <Typography variant="subtitle2" fontWeight={800}>
                                Core details
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Fields marked with * are required.
                            </Typography>
                        </Stack>

                        <TextField
                            label="Service name"
                            value={values.serviceName}
                            onChange={(e) => patch({ serviceName: e.target.value })}
                            sx={requiredFieldSx}
                            fullWidth
                            required
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Price"
                                type="number"
                                value={values.amount}
                                onChange={(e) => patch({ amount: e.target.value })}
                                inputProps={{ min: 0, step: '0.01' }}
                                sx={requiredFieldSx}
                                fullWidth
                                required
                            />

                            {showCurrency && (
                                <Box sx={{ minWidth: { xs: '100%', sm: 140 }, flexShrink: 0 }}>
                                    <CurrencySelect
                                        value={values.currency}
                                        onChange={(value) => patch({ currency: value })}
                                    />
                                </Box>
                            )}
                        </Stack>

                        <Stack spacing={1}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                Billing cadence
                            </Typography>

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {intervalOptions.map((option) => (
                                    <Chip
                                        key={option.value}
                                        label={option.label}
                                        clickable
                                        color={values.billingInterval === option.value ? 'primary' : 'default'}
                                        variant={values.billingInterval === option.value ? 'filled' : 'outlined'}
                                        onClick={() => patch({ billingInterval: option.value })}
                                        sx={{ fontWeight: 600, borderRadius: 999 }}
                                    />
                                ))}
                            </Stack>
                        </Stack>

                        <Stack spacing={1}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                Category
                            </Typography>

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {categoryOptions.map((option) => (
                                    <Chip
                                        key={option}
                                        label={option}
                                        clickable
                                        color={values.category === option ? 'primary' : 'default'}
                                        variant={values.category === option ? 'filled' : 'outlined'}
                                        onClick={() => patch({ category: option })}
                                        sx={{ fontWeight: 600, borderRadius: 999 }}
                                    />
                                ))}
                            </Stack>
                        </Stack>

                        <Stack spacing={1}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                Status
                            </Typography>

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {statusOptions.map((option) => (
                                    <Chip
                                        key={option}
                                        label={option}
                                        clickable
                                        color={values.status === option ? 'primary' : 'default'}
                                        variant={values.status === option ? 'filled' : 'outlined'}
                                        onClick={() => patch({ status: option })}
                                        sx={{ fontWeight: 600, borderRadius: 999 }}
                                    />
                                ))}
                            </Stack>
                        </Stack>

                        {isOther && (
                            <Alert severity="warning" sx={{ borderRadius: 3 }}>
                                “Other” is treated as non-active in the current flow and may be saved as
                                cancelled/inactive depending on backend rules.
                            </Alert>
                        )}

                        <TextField
                            label={billingDateLabel}
                            type="date"
                            value={values.renewalDate}
                            onChange={(e) => patch({ renewalDate: e.target.value })}
                            fullWidth
                            required
                            helperText={billingDateHelperText}
                            InputLabelProps={{ shrink: true }}
                            sx={requiredFieldSx}
                        />

                        {isTrial && (
                            <Alert severity="info" sx={{ borderRadius: 3 }}>
                                You should be warned before this date so you know a paid renewal is coming.
                                {trialReminderPreview
                                    ? ` Reminder: ${trialReminderPreview}.`
                                    : ' Select a first charge date to preview the reminder timing.'}
                            </Alert>
                        )}

                        <Accordion
                            disableGutters
                            elevation={0}
                            sx={{
                                bgcolor: 'transparent',
                                '&:before': { display: 'none' },
                            }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                                sx={{
                                    px: 0,
                                    minHeight: 'unset',
                                    '& .MuiAccordionSummary-content': {
                                        my: 0,
                                    },
                                }}
                            >
                                <Stack spacing={0.25}>
                                    <Typography fontWeight={700}>Optional details</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Add extra context only if it helps you later.
                                    </Typography>
                                </Stack>
                            </AccordionSummary>

                            <AccordionDetails
                                sx={{
                                    px: 0,
                                    pt: 1,
                                }}
                            >
                                <Stack spacing={2.5}>
                                    {showProviderGroup && (
                                        <TextField
                                            label="Provider group"
                                            value={values.providerGroup}
                                            onChange={(e) => patch({ providerGroup: e.target.value })}
                                            fullWidth
                                        />
                                    )}

                                    <TextField
                                        label="Notes"
                                        value={values.notes}
                                        onChange={(e) => patch({ notes: e.target.value })}
                                        fullWidth
                                        multiline
                                        minRows={4}
                                    />

                                    {showHouseholdShared && (
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1.5}
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                            justifyContent="space-between"
                                            sx={{
                                                border: `1px solid ${theme.palette.divider}`,
                                                borderRadius: 3,
                                                bgcolor: theme.palette.background.default,
                                                px: 2,
                                                py: 1.75,
                                            }}
                                        >
                                            <Box>
                                                <Typography fontWeight={700}>Household shared</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Mark this if the subscription is shared with family or household members.
                                                </Typography>
                                            </Box>

                                            <Button
                                                type="button"
                                                variant={values.householdShared ? 'contained' : 'outlined'}
                                                onClick={() => patch({ householdShared: !values.householdShared })}
                                                sx={{ fontWeight: 600, minWidth: 160 }}
                                            >
                                                {values.householdShared ? 'Shared' : 'Not shared'}
                                            </Button>
                                        </Stack>
                                    )}

                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Auto renew
                                        </Typography>

                                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                            <Chip
                                                label="On"
                                                clickable
                                                color={values.autoRenew ? 'primary' : 'default'}
                                                variant={values.autoRenew ? 'filled' : 'outlined'}
                                                onClick={() => patch({ autoRenew: true })}
                                                sx={{ fontWeight: 700, borderRadius: 999 }}
                                            />
                                            <Chip
                                                label="Off"
                                                clickable
                                                color={!values.autoRenew ? 'primary' : 'default'}
                                                variant={!values.autoRenew ? 'filled' : 'outlined'}
                                                onClick={() => patch({ autoRenew: false })}
                                                sx={{ fontWeight: 700, borderRadius: 999 }}
                                            />
                                        </Stack>
                                    </Stack>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Divider sx={{ pt: 0.5 }} />

                        <Stack
                            direction={{ xs: 'column-reverse', sm: 'row' }}
                            spacing={1.5}
                            sx={{ pt: 0.5 }}
                        >
                            <Button onClick={onCancel} variant="outlined" color="inherit" fullWidth sx={{ fontWeight: 700 }}>
                                Cancel
                            </Button>

                            <Button type="submit" variant="contained" disabled={submitting} fullWidth sx={{ fontWeight: 700 }}>
                                {submitting ? 'Saving...' : submitLabel}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </AppSurfaceCard>

            <AppSurfaceCard
                sx={{
                    flex: 0.62,
                    width: '100%',
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 2,
                    position: { lg: 'sticky' },
                    top: { lg: 96 },
                }}
            >
                <Stack spacing={2}>
                    <Typography variant="h6" fontWeight={800}>
                        Live summary
                    </Typography>

                    <Divider />

                    <Stack spacing={1.5}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Service
                            </Typography>
                            <Typography fontWeight={700}>
                                {values.serviceName || 'Untitled subscription'}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Status
                            </Typography>
                            <Typography fontWeight={700}>{values.status}</Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Normalized monthly
                            </Typography>
                            <Typography fontWeight={700} sx={{ textAlign: { lg: 'right' } }}>
                                {normalized.monthly.toFixed(2)} {values.currency}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Normalized yearly
                            </Typography>
                            <Typography fontWeight={700} sx={{ textAlign: { lg: 'right' } }}>
                                {normalized.yearly.toFixed(2)} {values.currency}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                {summaryDateLabel}
                            </Typography>
                            <Typography fontWeight={700} sx={{ textAlign: { lg: 'right' } }}>
                                {values.renewalDate || 'Not selected yet'}
                            </Typography>
                        </Box>

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
                                        This subscription is treated as a free trial for the UI flow. The selected date
                                        represents the first paid charge.
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        Reminder preview: {trialReminderPreview || 'Choose a first charge date'}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        Planned email step: send a reminder via email 2 days before trial expiration.
                                    </Typography>
                                </Stack>
                            </>
                        )}
                    </Stack>
                </Stack>
            </AppSurfaceCard>
        </Stack>
    );
};

export default SubscriptionFormCard;
