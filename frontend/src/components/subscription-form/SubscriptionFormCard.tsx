import React, { useMemo, useState } from 'react';
import { todayIsoDate } from '../../utils/dates';
import { HOUSEHOLD_SIZES } from '../../utils/householdShare';
import { daysBeforeLabel, defaultReminderLeadDays, REMINDER_LEAD_DAY_CHOICES, reminderLeadDays } from '../../utils/reminders';
import { Link as RouterLink } from 'react-router';
import { MANAGE_URL_MAX, manageUrlError } from '../../utils/manageUrl';
import PriceStepButtons from '../PriceStepButtons';
import { hideNumberSpinners, priceStepKeyDown } from '../../utils/stepPrice';
import { type CatalogService, findCatalogService, searchCatalog } from '../../data/services';
import CatalogTile from '../CatalogTile';
import { CATEGORIES } from '../../data/categories';
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
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    Switch,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CurrencySelect, { type Currency } from '../CurrencySelect';
import AppSurfaceCard from '../AppSurfaceCard';
import DateField from '../DateField';

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
    householdShared: boolean;
    /** People splitting the bill equally, the owner included (used when householdShared). */
    householdSize: number;
    autoRenew: boolean;
    b2b: boolean;
    /** Business only: paid with the owner's own card instead of the company's. */
    paidPersonally: boolean;
    /** Days before each charge the reminder goes out; null = the default for its cadence. Paid feature. */
    reminderLeadDays: number | null;
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
    showHouseholdShared?: boolean;
    /** Statuses to pick from. A new subscription is Active or Trial; Paused is for existing ones. */
    statusOptions?: SubscriptionStatus[];
    /** Suggest common services while typing the name; picking one fills the fields still untouched. */
    serviceSuggestions?: boolean;
    /** Shown under the price, e.g. that editing keeps the old price in the history. */
    priceHelperText?: string;
    /** Whether the account may choose when it's reminded (null while unknown: the choice stays disabled). */
    paidFeatures?: boolean | null;
};



const intervalOptions: { label: string; value: BillingInterval }[] = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Weekly', value: 'weekly' },
];


const SERVICE_SUGGESTIONS = searchCatalog('');

const DEFAULT_STATUS_OPTIONS: SubscriptionStatus[] = ['Active', 'Trial'];

const requiredFieldSx = {
    '& .MuiFormLabel-asterisk': {
        color: 'error.main',
    },
};

/** Hides the browser's own number arrows; the field's buttons step by whole units instead. */
const priceFieldSx = {
    ...requiredFieldSx,
    maxWidth: { sm: 200 },
    ...hideNumberSpinners,
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
                                                   showHouseholdShared = true,
                                                   statusOptions = DEFAULT_STATUS_OPTIONS,
                                                   serviceSuggestions = false,
                                                   priceHelperText,
                                                   paidFeatures = null,
                                               }) => {
    const theme = useTheme();
    // A catalog pick never overrides a choice the user made themselves.
    const [cadenceChosen, setCadenceChosen] = useState(false);
    const [categoryChosen, setCategoryChosen] = useState(false);
    const [filledFrom, setFilledFrom] = useState<string | null>(null);
    // The link the catalog filled in, and for which service. A link the user typed is never in here,
    // so it's never replaced; a filled one is replaced or cleared when the service changes.
    const [autoLink, setAutoLink] = useState<{ service: string; url: string } | null>(null);
    const linkIsAuto = autoLink !== null && values.manageUrl.trim() === autoLink.url;
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

    const defaultLeadDays = defaultReminderLeadDays(isTrial, values.billingInterval);
    const leadDays = reminderLeadDays(values.reminderLeadDays, isTrial, values.billingInterval, paidFeatures === true);
    // A value set through the API that isn't one of the offered choices is still shown.
    const leadDayChoices = values.reminderLeadDays !== null && !REMINDER_LEAD_DAY_CHOICES.includes(values.reminderLeadDays)
        ? [...REMINDER_LEAD_DAY_CHOICES, values.reminderLeadDays].sort((a, b) => a - b)
        : REMINDER_LEAD_DAY_CHOICES;

    const trialReminderPreview = useMemo(() => {
        if (!isTrial || !values.renewalDate) return null;

        const chargeDate = new Date(`${values.renewalDate}T12:00:00`);
        if (Number.isNaN(chargeDate.getTime())) return null;

        const reminderDate = new Date(chargeDate);
        reminderDate.setDate(reminderDate.getDate() - leadDays);

        // Local calendar date (toISOString() would give the UTC date, off by one near midnight).
        return todayIsoDate(reminderDate);
    }, [isTrial, values.renewalDate, leadDays]);

    const patch = (partial: Partial<SubscriptionFormValues>) => {
        onChange({ ...values, ...partial });
    };

    /** Fills what the catalog knows; `serviceName` keeps the user's own text when they typed it. */
    const pickService = (service: CatalogService, serviceName: string = service.name) => {
        const filled: string[] = [];
        const next: Partial<SubscriptionFormValues> = { serviceName };
        if (!categoryChosen && service.category !== values.category) {
            next.category = service.category;
            filled.push(`category ${service.category}`);
        }
        if (!cadenceChosen && service.cadence !== values.billingInterval) {
            next.billingInterval = service.cadence;
            filled.push(`${service.cadence} billing`);
        }
        if (!values.manageUrl.trim() || linkIsAuto) {
            next.manageUrl = service.manageUrl ?? '';
            setAutoLink(service.manageUrl ? { service: service.name, url: service.manageUrl } : null);
            if (service.manageUrl) filled.push('the manage or cancel link');
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
                // Typing a catalog name exactly ("Netflix", or an alias like "office 365") counts as picking it,
                // so the link is filled in even if the suggestion isn't clicked. Plan names don't match here.
                const typedService = reason === 'input' ? findCatalogService(next) : undefined;
                if (typedService) {
                    pickService(typedService, next);
                    return;
                }
                if (reason === 'input' || reason === 'clear') {
                    // A filled-in link belongs to its service: once the name is something else, drop it.
                    const stillThatService = autoLink !== null && next.toLowerCase().includes(autoLink.service.toLowerCase());
                    if (linkIsAuto && !stillThatService) {
                        patch({ serviceName: next, manageUrl: '' });
                        setAutoLink(null);
                    } else {
                        patch({ serviceName: next });
                    }
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

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                            {/* Narrow, so the arrows sit next to the digits; the currency stays on the right. */}
                            <TextField
                                label="Price"
                                type="number"
                                value={values.amount}
                                onChange={(e) => patch({ amount: e.target.value })}
                                onKeyDown={priceStepKeyDown(values.amount, (amount) => patch({ amount }))}
                                inputProps={{ min: 0, step: '0.01', 'aria-describedby': priceHelperText ? 'price-helper-text' : undefined }}
                                InputProps={{ endAdornment: <PriceStepButtons value={values.amount} onChange={(amount) => patch({ amount })} /> }}
                                sx={priceFieldSx}
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
                        {priceHelperText && (
                            <FormHelperText id="price-helper-text" sx={{ mt: '4px !important', mx: '14px' }}>{priceHelperText}</FormHelperText>
                        )}

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

                        <TextField
                            select
                            label="Category"
                            value={values.category}
                            onChange={(event) => {
                                setCategoryChosen(true);
                                patch({ category: event.target.value });
                            }}
                            sx={{ maxWidth: { sm: 320 } }}
                        >
                            {/* An older subscription may still have a category from the earlier, broader list. */}
                            {!(CATEGORIES as readonly string[]).includes(values.category) && (
                                <MenuItem value={values.category}>{values.category}</MenuItem>
                            )}
                            {CATEGORIES.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </TextField>

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
                            <DateField
                                className="subscription-date-field"
                                label={billingDateLabel}
                                value={values.renewalDate}
                                onChange={(e) => patch({ renewalDate: e.target.value })}
                                fullWidth
                                required
                                helperText={billingDateHelperText}
                                inputProps={{ min: todayIsoDate() }}
                                sx={requiredFieldSx}
                            />
                        </Stack>

                        <Stack className="subscription-business-toggle" direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800}>Business subscription</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Paid by your company or for your freelance work. Shown in the Business view.
                                </Typography>
                            </Box>
                            <Switch
                                checked={values.b2b}
                                onChange={(event) => patch(event.target.checked
                                    ? { b2b: true, householdShared: false }
                                    : { b2b: false, paidPersonally: false })}
                                inputProps={{ 'aria-label': 'Business subscription' }}
                            />
                        </Stack>

                        {values.b2b && (
                            <FormControl className="subscription-paid-with">
                                <FormLabel id="paid-with-label">Paid with</FormLabel>
                                <RadioGroup
                                    row
                                    aria-labelledby="paid-with-label"
                                    value={values.paidPersonally ? 'personal' : 'company'}
                                    onChange={(event) => patch({ paidPersonally: event.target.value === 'personal' })}
                                >
                                    <FormControlLabel value="company" control={<Radio size="small" />} label="Company card" />
                                    <FormControlLabel value="personal" control={<Radio size="small" />} label="My own card" />
                                </RadioGroup>
                                <FormHelperText>
                                    {values.paidPersonally
                                        ? 'The company owes it back to you. The invoice checklist adds it up each month.'
                                        : 'Paid by the company.'}
                                </FormHelperText>
                            </FormControl>
                        )}

                        {isPaused && (
                            <Stack spacing={1.5}>
                                <Alert severity="info" sx={{ borderRadius: 3 }}>
                                    A paused subscription isn’t charged, gets no reminders and isn’t counted in your totals.
                                    Pick the day it starts again, or leave it empty to keep it paused until you change it.
                                </Alert>
                                <DateField
                                    className="subscription-date-field"
                                    label="Resumes on (optional)"
                                    value={values.resumesOn}
                                    onChange={(e) => patch({ resumesOn: e.target.value })}
                                    helperText="It becomes active again on this day."
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
                                    <TextField
                                        label="Manage or cancel link"
                                        type="url"
                                        value={values.manageUrl}
                                        onChange={(e) => {
                                            setAutoLink(null);
                                            patch({ manageUrl: e.target.value });
                                        }}
                                        placeholder="https://"
                                        error={manageLinkError !== null}
                                        helperText={manageLinkError ?? 'The provider’s page where you manage or cancel it, shown as a link on the subscription. Providers change their pages, so check it if it stops working.'}
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

                                    <TextField
                                        select
                                        label="Remind me"
                                        value={values.reminderLeadDays ?? 'default'}
                                        onChange={(event) => patch({ reminderLeadDays: event.target.value === 'default' ? null : Number(event.target.value) })}
                                        disabled={paidFeatures !== true}
                                        helperText={paidFeatures === false ? (
                                            <>Choosing when you’re reminded comes with the one-time unlock. <RouterLink to="/plans">See plans</RouterLink></>
                                        ) : 'Days before each charge the reminder email goes out.'}
                                        sx={{ maxWidth: 320 }}
                                    >
                                        <MenuItem value="default">Default: {daysBeforeLabel(defaultLeadDays)}</MenuItem>
                                        {leadDayChoices.map((days) => (
                                            <MenuItem key={days} value={days}>{daysBeforeLabel(days)}</MenuItem>
                                        ))}
                                    </TextField>
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
                                        The reminder email goes out {daysBeforeLabel(leadDays)} the first charge.
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
