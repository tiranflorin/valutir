import React, { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import AppSurfaceCard from '../components/AppSurfaceCard';
import CurrencySelect, { Currency } from '../components/CurrencySelect';

type BillingInterval = 'monthly' | 'yearly' | 'quarterly' | 'weekly';
type SubscriptionStatus = 'Active' | 'Trial' | 'Other';

const intervalOptions: { label: string; value: BillingInterval }[] = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Weekly', value: 'weekly' },
];

const categoryOptions = [
    'Entertainment / Streaming',
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

const RequiredMark = () => (
    <Box
        component="span"
        sx={{
            color: 'error.main',
            fontWeight: 700,
        }}
    >
        {' '}*
    </Box>
);

const AddSubscriptionPage: React.FC = () => {
    const theme = useTheme();

    const [serviceName, setServiceName] = useState('');
    const [amount, setAmount] = useState('15.99');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
    const [renewalDate, setRenewalDate] = useState('');
    const [category, setCategory] = useState('Streaming');
    const [status, setStatus] = useState<SubscriptionStatus>('Active');
    const [notes, setNotes] = useState('');
    const [providerGroup, setProviderGroup] = useState('');
    const [householdShared, setHouseholdShared] = useState(false);

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

    return (
        <AppShell centered={false} maxWidth="lg" showThemeToggle={false}>
            <AppHeader />

            <Stack
                spacing={3}
                sx={{
                    mt: { xs: 4, md: 6 },
                    width: '100%',
                }}
            >
                <Box sx={{ width: '100%' }}>
                    <Button
                        component={RouterLink}
                        to="/my-subs"
                        startIcon={<ArrowBackRoundedIcon />}
                        sx={{ borderRadius: 999, fontWeight: 700 }}
                    >
                        Back to My Subs
                    </Button>
                </Box>

                <AppSurfaceCard
                    sx={{
                        width: '100%',
                        p: { xs: 3, md: 4 },
                    }}
                >
                    <Stack spacing={1.25}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                            Add subscription
                        </Typography>
                        <Typography color="text.secondary">
                            Add the essentials first. Optional details stay hidden until you need them.
                        </Typography>
                    </Stack>
                </AppSurfaceCard>

                <AppSurfaceCard
                    sx={{
                        width: '100%',
                        p: { xs: 3, md: 4 },
                    }}
                >
                    <Stack spacing={3.5} sx={{ width: '100%' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
                                Core details
                            </Typography>
                            <Typography color="text.secondary">
                                Fields marked with<RequiredMark /> are required.
                            </Typography>
                        </Box>

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

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                gap: { xs: 2, md: 3 },
                                alignItems: { xs: 'stretch', md: 'flex-start' },
                                width: '100%',
                            }}
                        >
                            <Box sx={{ flex: { md: '1 1 0%' }, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                                    Billing cadence<RequiredMark />
                                </Typography>

                                <Box
                                    sx={{
                                        minHeight: 56,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        {intervalOptions.map((option) => (
                                            <Chip
                                                key={option.value}
                                                label={option.label}
                                                clickable
                                                color={billingInterval === option.value ? 'primary' : 'default'}
                                                onClick={() => setBillingInterval(option.value)}
                                                sx={{ fontWeight: 600, borderRadius: 999 }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    width: { xs: '100%', md: 240 },
                                    flexShrink: 0,
                                    pt: { xs: 0, md: 4.25 },
                                }}
                            >
                                <TextField
                                    required
                                    label="Next billing date"
                                    type="date"
                                    fullWidth
                                    value={renewalDate}
                                    onChange={(e) => setRenewalDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={requiredFieldSx}
                                />
                            </Box>
                        </Box>

                        <Box>
                            <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                                Category<RequiredMark />
                            </Typography>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {categoryOptions.map((option) => (
                                    <Chip
                                        key={option}
                                        label={option}
                                        clickable
                                        color={category === option ? 'secondary' : 'default'}
                                        onClick={() => setCategory(option)}
                                        sx={{ fontWeight: 600, borderRadius: 999 }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        <Box>
                            <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                                Status<RequiredMark />
                            </Typography>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {statusOptions.map((option) => (
                                    <Chip
                                        key={option}
                                        label={option}
                                        clickable
                                        color={status === option ? 'primary' : 'default'}
                                        onClick={() => setStatus(option)}
                                        sx={{ fontWeight: 600, borderRadius: 999 }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        <Accordion
                            disableGutters
                            elevation={0}
                            sx={{
                                background: 'transparent',
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '12px !important',
                                '&:before': { display: 'none' },
                                width: '100%',
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                                <Box>
                                    <Typography sx={{ fontWeight: 700 }}>
                                        Optional details
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Add extra context only if it helps you later.
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Provider group"
                                        placeholder="google, apple, netflix, gym, other"
                                        fullWidth
                                        value={providerGroup}
                                        onChange={(e) => setProviderGroup(e.target.value)}
                                    />

                                    <TextField
                                        label="Notes"
                                        placeholder="Family plan, billed through Apple, need to confirm usage..."
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />

                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                        <Typography variant="body2" color="text.secondary">
                                            Household shared
                                        </Typography>
                                        <Chip
                                            label={householdShared ? 'Yes' : 'No'}
                                            clickable
                                            color={householdShared ? 'secondary' : 'default'}
                                            onClick={() => setHouseholdShared((prev) => !prev)}
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </Stack>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Button
                                variant="contained"
                                size="large"
                                sx={{
                                    borderRadius: 999,
                                    px: 3,
                                    fontWeight: 700,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                }}
                            >
                                Save subscription
                            </Button>
                            <Button
                                component={RouterLink}
                                to="/my-subs"
                                variant="outlined"
                                size="large"
                                sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                            >
                                Cancel
                            </Button>
                        </Stack>
                    </Stack>
                </AppSurfaceCard>

                <AppSurfaceCard
                    sx={{
                        width: '100%',
                        p: { xs: 3, md: 4 },
                    }}
                >
                    <Stack spacing={2}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Live summary
                        </Typography>

                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Service
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                                {serviceName || 'Untitled subscription'}
                            </Typography>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Status
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                                {status}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Normalized monthly
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                {normalized.monthly.toFixed(2)} {currency}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Normalized yearly
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                                {normalized.yearly.toFixed(2)} {currency}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Next billing
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                                {renewalDate || 'Not selected yet'}
                            </Typography>
                        </Box>
                    </Stack>
                </AppSurfaceCard>
            </Stack>
        </AppShell>
    );
};

export default AddSubscriptionPage;
