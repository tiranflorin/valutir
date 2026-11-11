import React, { useMemo, useState } from 'react';
import { todayIsoDate } from '../../utils/dates';
import { HOUSEHOLD_SIZES } from '../../utils/householdShare';
import { TRIAL_REMINDER_LEAD_DAYS } from '../../utils/reminders';
import { MANAGE_URL_MAX, manageUrlError } from '../../utils/manageUrl';
import { type CatalogService, searchCatalog } from '../../data/services';
import CatalogTile from '../CatalogTile';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Divider,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CurrencySelect, { type Currency } from '../CurrencySelect';
import AppSurfaceCard from '../AppSurfaceCard';

export type BillingInterval = 'monthly' | 'yearly' | 'quarterly' | 'weekly';
export type SubscriptionStatus = 'Active' | 'Trial' | 'Paused';

export type SubscriptionFormValues = {
    serviceName: string;
    amount: string;
    currency: Currency;
    billingInterval: BillingInterval;
    renewalDate: string;
    category: string;
    status: SubscriptionStatus;
    /** Paused only: when it becomes active again (YYYY-MM-DD); empty = until changed. */
    resumesOn: string;
    notes: string;
    /** Where to manage or cancel it with the provider (https); empty = none. */
    manageUrl: string;
    providerGroup: string;
    householdShared: boolean;
    /** People splitting the bill equally, the owner included (used when householdShared). */
    householdSize: number;
    autoRenew: boolean;
    b2b: boolean;
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
    showHeader?: boolean;
    showCurrency?: boolean;
    showProviderGroup?: boolean;
    showHouseholdShared?: boolean;
    /** Statuses to pick from. A new subscription is Active or Trial; Paused is for existing ones. */
    statusOptions?: SubscriptionStatus[];
    /** Suggest common services while typing the name; picking one fills the fields still untouched. */
    serviceSuggestions?: boolean;
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

const SERVICE_SUGGESTIONS = searchCatalog('');

const DEFAULT_STATUS_OPTIONS: SubscriptionStatus[] = ['Active', 'Trial'];

const requiredFieldSx = {
    '& .MuiFormLabel-asterisk': {
        color: 'error.main',
    },
};

const FormFieldLabel: React.FC<{ label: string; required?: boolean }> = ({ label, required = false }) => (
    <Typography component="div" variant="subtitle2" className="subscription-form-field-label">
        {label}{required && <span className="subscription-form-required-marker" aria-hidden="true">*</span>}
    </Typography>
);

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
                                                   showHeader = true,
                                                   showCurrency = true,
                                                   showProviderGroup = true,
                                                   showHouseholdShared = true,
                                                   statusOptions = DEFAULT_STATUS_OPTIONS,
                                                   serviceSuggestions = false,
                                               }) => {
    const theme = useTheme();
    // A catalog pick never overrides a choice the user made themselves.
    const [cadenceChosen, setCadenceChosen] = useState(false);
    const [categoryChosen, setCategoryChosen] = useState(false);
    const [filledFrom, setFilledFrom] = useState<string | null>(null);
    const manageLinkError = manageUrlError(values.manageUrl);

    const isTrial = values.status === 'Trial';
    const isPaused = values.status === 'Paused';
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
        reminderDate.setDate(reminderDate.getDate() - TRIAL_REMINDER_LEAD_DAYS);

        // Local calendar date (toISOString() would give the UTC date, off by one near midnight).
        return todayIsoDate(reminderDate);
    }, [isTrial, values.renewalDate]);

    const patch = (partial: Partial<SubscriptionFormValues>) => {
        onChange({ ...values, ...partial });
    };

    const pickService = (service: CatalogService) => {
        const filled: string[] = [];
        const next: Partial<SubscriptionFormValues> = { serviceName: service.name };
        if (!categoryChosen && service.category !== values.category) {
            next.category = service.category;
            filled.push(`category ${service.category}`);
        }
        if (!cadenceChosen && service.cadence !== values.billingInterval) {
            next.billingInterval = service.cadence;
            filled.push(`${service.cadence} billing`);
        }
        if (!values.manageUrl.trim() && service.manageUrl) {
            next.manageUrl = service.manageUrl;
            filled.push('the manage or cancel link');
        }
        patch(next);
        setFilledFrom(filled.length ? `Filled in ${filled.join(', ')} for ${service.name}. Change anything that’s different for you.` : null);
    };

    const serviceNameField = serviceSuggestions ? (
        <Autocomplete<CatalogService, false, false, true>
            freeSolo
            options={SERVICE_SUGGESTIONS}
            filterOptions={(_, state) => searchCatalog(state.inputValue).slice(0, 8)}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
            inputValue={values.serviceName}
            onInputChange={(_, next, reason) => {
                if (reason === 'input' || reason === 'clear') {
                    patch({ serviceName: next });
                    setFilledFrom(null);
                }
            }}
            onChange={(_, option) => {
                if (option && typeof option !== 'string') pickService(option);
            }}
            renderOption={({ key, ...props }, option) => (
                <li key={key} {...props} className={`${props.className ?? ''} catalog-option`}>
                    <CatalogTile service={option} />
                    <span>{option.name}</span>
                    <small>{option.category}</small>
                </li>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Service name"
                    required
                    sx={requiredFieldSx}
                    helperText={filledFrom ?? 'Start typing to pick a common service, or enter any name.'}
                />
            )}
        />
    ) : (
        <TextField
            label="Service name"
            value={values.serviceName}
            onChange={(e) => patch({ serviceName: e.target.value })}
            sx={requiredFieldSx}
            fullWidth
            required
        />
    );

    return (
        <Stack
            className="subscription-form-layout"
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems="flex-start"
            sx={{ width: '100%' }}
        >
            <AppSurfaceCard
                sx={{
                    flex: 1.65,
                    width: '100%',
                    p: { xs: 2.25, md: 3.25 },
                    borderRadius: '14px',
                    backgroundColor: 'background.paper',
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
                        {showHeader && <Stack spacing={0.75} className="subscription-form-card-heading">
                            <Typography variant="h5" fontWeight={800}>
                                {title}
                            </Typography>
                            <Typography color="text.secondary">{description}</Typography>
                        </Stack>}

                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 3 }}>
                                {error}
                            </Alert>
                        )}

                        <Stack spacing={0.5}>
                            <Typography variant="subtitle1" fontWeight={800}>
                                Core details
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Fields marked with * are required.
                            </Typography>
                        </Stack>

                        {serviceNameField}

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
                            <FormFieldLabel label="Billing cadence" required />

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {intervalOptions.map((option) => (
                                    <Chip
                                        key={option.value}
                                        label={option.label}
                                        clickable
                                        color={values.billingInterval === option.value ? 'primary' : 'default'}
                                        variant={values.billingInterval === option.value ? 'filled' : 'outlined'}
                                        onClick={() => {
                                            setCadenceChosen(true);
                                            patch({ billingInterval: option.value });
                                        }}
                                        sx={{ fontWeight: 600, borderRadius: 999 }}
                                    />
                                ))}
                            </Stack>
                        </Stack>

                        <Stack spacing={1}>
                            <FormFieldLabel label="Category" />

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {categoryOptions.map((option) => (
                                    <Chip
                                        key={option}
                                        label={option}
                                        clickable
                                        color={values.category === option ? 'primary' : 'default'}
                                        variant={values.category === option ? 'filled' : 'outlined'}
                                        onClick={() => {
                                            setCategoryChosen(true);
                                            patch({ category: option });
                                        }}
                                        sx={{ fontWeight: 600, borderRadius: 999 }}
                                    />
                                ))}
                            </Stack>
                        </Stack>

                        <Stack
                            className="subscription-status-date-row"
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems="flex-start"
                        >
                            {statusOptions.length > 0 && <Stack spacing={1} className="subscription-status-field">
                                <FormFieldLabel label="Status" />
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
                            </Stack>}
                            <TextField
                                className="subscription-date-field"
                                label={billingDateLabel}
                                type="date"
                                value={values.renewalDate}
                                onChange={(e) => patch({ renewalDate: e.target.value })}
                                fullWidth
                                required
                                helperText={billingDateHelperText}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: todayIsoDate() }}
                                sx={requiredFieldSx}
                            />
                        </Stack>

                        <Stack className="subscription-business-toggle" direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800}>Business subscription</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Track this subscription as a business expense.
                                </Typography>
                            </Box>
                            <Switch
                                checked={values.b2b}
                                onChange={(event) => patch(event.target.checked
                                    ? { b2b: true, householdShared: false }
                                    : { b2b: false })}
                                inputProps={{ 'aria-label': 'Business subscription' }}
                            />
                        </Stack>

                        {isPaused && (
                            <Stack spacing={1.5}>
                                <Alert severity="info" sx={{ borderRadius: 3 }}>
                                    A paused subscription isn’t charged, gets no reminders and isn’t counted in your totals.
                                    Pick the day it starts again, or leave it empty to keep it paused until you change it.
                                </Alert>
                                <TextField
                                    className="subscription-date-field"
                                    label="Resumes on (optional)"
                                    type="date"
                                    value={values.resumesOn}
                                    onChange={(e) => patch({ resumesOn: e.target.value })}
                                    helperText="It becomes active again on this day."
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: todayIsoDate() }}
                                />
                            </Stack>
                        )}

                        {isTrial && (
                            <Alert severity="info" sx={{ borderRadius: 3 }}>
                                You should be warned before this date so you know a paid renewal is coming.
                                {trialReminderPreview
                                    ? ` Reminder: ${trialReminderPreview}.`
                                    : ' Select a date.'}
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
                                        label="Manage or cancel link"
                                        type="url"
                                        value={values.manageUrl}
                                        onChange={(e) => patch({ manageUrl: e.target.value })}
                                        placeholder="https://"
                                        error={manageLinkError !== null}
                                        helperText={manageLinkError ?? 'The provider’s page where you manage or cancel it. Shown as a link on the subscription.'}
                                        inputProps={{ maxLength: MANAGE_URL_MAX, inputMode: 'url' }}
                                        fullWidth
                                    />

                                    <TextField
                                        label="Notes"
                                        value={values.notes}
                                        onChange={(e) => patch({ notes: e.target.value })}
                                        fullWidth
                                        multiline
                                        minRows={4}
                                    />

                                    {showHouseholdShared && !values.b2b && (
                                        <Stack
                                            spacing={1.5}
                                            sx={{
                                                border: `1px solid ${theme.palette.divider}`,
                                                borderRadius: 3,
                                                bgcolor: theme.palette.background.default,
                                                px: 2,
                                                py: 1.75,
                                            }}
                                        >
                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1.5}
                                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                justifyContent="space-between"
                                            >
                                                <Box>
                                                    <Typography fontWeight={700}>Household shared</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Split the bill equally with family or household members.
                                                    </Typography>
                                                </Box>

                                                <Button
                                                    type="button"
                                                    variant={values.householdShared ? 'contained' : 'outlined'}
                                                    aria-pressed={values.householdShared}
                                                    onClick={() => patch({ householdShared: !values.householdShared })}
                                                    sx={{ fontWeight: 600, minWidth: 160 }}
                                                >
                                                    {values.householdShared ? 'Shared' : 'Not shared'}
                                                </Button>
                                            </Stack>

                                            {values.householdShared && (
                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                                    <TextField
                                                        select
                                                        label="Split between"
                                                        value={values.householdSize}
                                                        onChange={(event) => patch({ householdSize: Number(event.target.value) })}
                                                        helperText="People sharing the bill, you included"
                                                        sx={{ minWidth: 200 }}
                                                    >
                                                        {HOUSEHOLD_SIZES.map((size) => (
                                                            <MenuItem key={size} value={size}>{size} people</MenuItem>
                                                        ))}
                                                    </TextField>
                                                    <Typography variant="body2" aria-live="polite">
                                                        Your share: <strong>{(parsedAmount / values.householdSize).toFixed(2)} {values.currency}</strong> per {values.billingInterval} bill
                                                    </Typography>
                                                </Stack>
                                            )}
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
                    p: { xs: 2.25, md: 3 },
                    borderRadius: '14px',
                    backgroundColor: 'background.paper',
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
