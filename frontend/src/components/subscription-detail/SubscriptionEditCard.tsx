import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AppSurfaceCard from '../AppSurfaceCard';
import { VITE_API_URL } from '../../services/auth';
import type { SubscriptionCardModel } from './SubscriptionHeaderCard';

const billingOptions = ['monthly', 'yearly', 'quarterly', 'weekly'];
const categoryOptions = [
    'Entertainment / Streaming',
    'Software',
    'Fitness',
    'Banking',
    'Utilities',
    'Cloud',
    'Other',
];

type Props = {
    subscription: SubscriptionCardModel;
    token: string;
    onUnauthorized: () => void;
    onSaved: (subscription: SubscriptionCardModel) => void;
    onCancel: () => void;
};

const SubscriptionEditCard: React.FC<Props> = ({
                                                   subscription,
                                                   token,
                                                   onUnauthorized,
                                                   onSaved,
                                                   onCancel,
                                               }) => {
    const [serviceName, setServiceName] = useState(subscription.serviceName);
    const [amount, setAmount] = useState(String(subscription.amount));
    const [category, setCategory] = useState(subscription.category ?? 'Other');
    const [billingCadence, setBillingCadence] = useState(subscription.billingCadence);
    const [nextBillingDate, setNextBillingDate] = useState(subscription.nextBillingDate ?? '');
    const [notes, setNotes] = useState(subscription.notes ?? '');
    const [autoRenew, setAutoRenew] = useState(subscription.autoRenew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const normalized = useMemo(() => {
        const parsedAmount = Number(amount) || 0;

        if (billingCadence === 'monthly') {
            return { monthly: parsedAmount, yearly: parsedAmount * 12 };
        }

        if (billingCadence === 'yearly') {
            return { monthly: parsedAmount / 12, yearly: parsedAmount };
        }

        if (billingCadence === 'quarterly') {
            return { monthly: parsedAmount / 3, yearly: parsedAmount * 4 };
        }

        return { monthly: (parsedAmount * 52) / 12, yearly: parsedAmount * 52 };
    }, [amount, billingCadence]);

    const handleSave = async () => {
        if (!serviceName.trim()) {
            setError('Service name is required.');
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        try {
            setSaving(true);
            setError('');

            const response = await fetch(`${VITE_API_URL}/api/subs/${subscription.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    serviceName: serviceName.trim(),
                    category,
                    amount: Number(amount),
                    currency: subscription.currency,
                    billingCadence,
                    nextBillingDate: nextBillingDate || null,
                    notes: notes.trim() || null,
                    isActive: true,
                    autoRenew,
                    cancelledAt: null,
                }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                onUnauthorized();
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to update subscription.');
            }

            onSaved(data ?? {
                ...subscription,
                serviceName: serviceName.trim(),
                category,
                amount: Number(amount),
                billingCadence,
                nextBillingDate: nextBillingDate || null,
                notes: notes.trim() || null,
                isActive: true,
                autoRenew,
                cancelledAt: null,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Edit subscription
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Update the current subscription details and save the changes back to your account.
                    </Typography>
                </Box>

                <Stack spacing={2}>
                    <TextField
                        label="Service name"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        fullWidth
                        required
                    />

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            label={`Amount (${subscription.currency})`}
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            inputProps={{ min: 0, step: '0.01' }}
                            fullWidth
                            required
                        />

                        <TextField
                            label="Next billing date"
                            type="date"
                            value={nextBillingDate}
                            onChange={(e) => setNextBillingDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Stack>

                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Billing cadence
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {billingOptions.map((option) => (
                                <Chip
                                    key={option}
                                    label={option.charAt(0).toUpperCase() + option.slice(1)}
                                    clickable
                                    color={billingCadence === option ? 'primary' : 'default'}
                                    onClick={() => setBillingCadence(option)}
                                    sx={{ fontWeight: 700, borderRadius: 999 }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Category
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
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Auto renew
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip
                                label="Yes"
                                clickable
                                color={autoRenew ? 'success' : 'default'}
                                onClick={() => setAutoRenew(true)}
                                sx={{ fontWeight: 700, borderRadius: 999 }}
                            />
                            <Chip
                                label="No"
                                clickable
                                color={!autoRenew ? 'default' : 'default'}
                                onClick={() => setAutoRenew(false)}
                                sx={{ fontWeight: 700, borderRadius: 999 }}
                            />
                        </Stack>
                    </Box>

                    <TextField
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        multiline
                        minRows={3}
                        fullWidth
                    />
                </Stack>

                <Box
                    sx={{
                        p: 2,
                        borderRadius: 3,
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        Live summary
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.75 }}>
                        {normalized.monthly.toFixed(2)} {subscription.currency} / month
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        {normalized.yearly.toFixed(2)} {subscription.currency} / year
                    </Typography>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button
                        variant="contained"
                        startIcon={<SaveRoundedIcon />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={onCancel}
                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                    >
                        Cancel
                    </Button>
                </Stack>
            </Stack>
        </AppSurfaceCard>
    );
};

export default SubscriptionEditCard;
