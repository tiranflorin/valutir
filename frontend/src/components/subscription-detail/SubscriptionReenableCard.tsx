import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import AppSurfaceCard from '../AppSurfaceCard';
import { useAuth } from '../../context/AuthContext';
import { useAccountErrorHandler } from '../../hooks/useAccountErrorHandler';
import { nextChargeOnOrAfter } from '../../utils/buildRecurringOccurrences';
import { isAfterToday, todayIsoDate } from '../../utils/dates';
import { updateSubscription } from '../../services/subscriptions';
import type { SubscriptionCardModel, SubscriptionRecord } from '../../types/subscription';
import DateField from '../DateField';

type Props = {
    subscription: SubscriptionCardModel;
    onReenabled: (subscription: SubscriptionRecord) => void;
};

const SubscriptionReenableCard: React.FC<Props> = ({
                                                       subscription,
                                                       onReenabled,
                                                   }) => {
    const { token } = useAuth();
    const errorMessage = useAccountErrorHandler();
    const [wasReenabled, setWasReenabled] = useState<boolean | null>(null);
    const [reenabledFromDate, setReenabledFromDate] = useState('');
    const [reenabledPrice, setReenabledPrice] = useState(String(subscription.amount ?? ''));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleReenable = async () => {
        if (wasReenabled !== true) {
            setError('Please confirm that the subscription was re-enabled.');
            return;
        }

        if (!reenabledFromDate) {
            setError('Please provide the re-enabled date.');
            return;
        }

        if (isAfterToday(reenabledFromDate)) {
            setError("The re-enabled date can't be in the future.");
            return;
        }

        if (subscription.cancelledAt && reenabledFromDate < subscription.cancelledAt) {
            setError("The re-enabled date can't be before the cancellation date.");
            return;
        }

        if (!reenabledPrice || Number(reenabledPrice) <= 0) {
            setError('Please provide a valid re-enabled price.');
            return;
        }

        // The restart starts a new billing cycle: the next charge counts from the re-enabled date,
        // not from the old cycle's billing date.
        const nextBillingDate = nextChargeOnOrAfter(reenabledFromDate, subscription.billingCadence, todayIsoDate());

        try {
            setSaving(true);
            setError('');

            onReenabled(await updateSubscription(token, subscription, {
                amount: Number(reenabledPrice),
                nextBillingDate,
                status: 'active',
                autoRenew: true,
                cancelledAt: null,
                trialEndsAt: null,
                startedAt: reenabledFromDate,
            }));
        } catch (err) {
            const message = errorMessage(err);
            if (message !== null) setError(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppSurfaceCard
            className="subscription-reenable-card"
            sx={{
                p: { xs: 3, md: 4 },
                border: (theme) => `1px solid ${theme.palette.success.light}`,
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Re-enable subscription
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        This subscription is inactive. Record if you started paying for it again, when it restarted, and at what price.
                    </Typography>
                </Box>

                <Box>
                    <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                        Did you re-enable this subscription?
                    </Typography>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip
                            label="Yes"
                            clickable
                            color={wasReenabled === true ? 'success' : 'default'}
                            onClick={() => setWasReenabled(true)}
                            sx={{ fontWeight: 700, borderRadius: 999 }}
                        />
                        <Chip
                            label="No"
                            clickable
                            color={wasReenabled === false ? 'default' : 'default'}
                            onClick={() => setWasReenabled(false)}
                            sx={{ fontWeight: 700, borderRadius: 999 }}
                        />
                    </Stack>
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <DateField
                        label="Re-enabled from"
                        fullWidth
                        value={reenabledFromDate}
                        onChange={(e) => setReenabledFromDate(e.target.value)}
                        // Already restarted: today or earlier, and not before it was cancelled.
                        inputProps={{ min: subscription.cancelledAt ?? undefined, max: todayIsoDate() }}
                        disabled={wasReenabled !== true}
                    />

                    <TextField
                        label={`Price (${subscription.currency})`}
                        type="number"
                        fullWidth
                        value={reenabledPrice}
                        onChange={(e) => setReenabledPrice(e.target.value)}
                        inputProps={{ min: 0, step: '0.01' }}
                        disabled={wasReenabled !== true}
                    />
                </Stack>

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<RestartAltRoundedIcon />}
                        disabled={saving || wasReenabled !== true}
                        onClick={handleReenable}
                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                    >
                        {saving ? 'Saving...' : 'Re-enable subscription'}
                    </Button>
                </Stack>
            </Stack>
        </AppSurfaceCard>
    );
};

export default SubscriptionReenableCard;
