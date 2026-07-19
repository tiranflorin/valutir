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
import { VITE_API_URL } from '../../services/auth';
import type { SubscriptionCardModel } from './SubscriptionHeaderCard';

type Props = {
    subscription: SubscriptionCardModel;
    token: string;
    onUnauthorized: () => void;
    onReenabled: (subscription: SubscriptionCardModel) => void;
};

const SubscriptionReenableCard: React.FC<Props> = ({
                                                       subscription,
                                                       token,
                                                       onUnauthorized,
                                                       onReenabled,
                                                   }) => {
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

        if (!reenabledPrice || Number(reenabledPrice) <= 0) {
            setError('Please provide a valid re-enabled price.');
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
                    serviceName: subscription.serviceName,
                    category: subscription.category,
                    amount: Number(reenabledPrice),
                    currency: subscription.currency,
                    billingCadence: subscription.billingCadence,
                    nextBillingDate: subscription.nextBillingDate,
                    notes: subscription.notes,
                    status: string,
                    autoRenew: true,
                    cancelledAt: null,
                    startedAt: reenabledFromDate,
                }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                onUnauthorized();
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to re-enable subscription.');
            }

            onReenabled(data ?? {
                ...subscription,
                amount: Number(reenabledPrice),
                status: 'active',
                autoRenew: true,
                cancelledAt: null,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppSurfaceCard
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
                    <TextField
                        label="Re-enabled from"
                        type="date"
                        fullWidth
                        value={reenabledFromDate}
                        onChange={(e) => setReenabledFromDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
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
