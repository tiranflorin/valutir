import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    FormControl,
    FormControlLabel,
    FormLabel,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { API_URL } from '../../config';
import { isAfterToday, todayIsoDate } from '../../utils/dates';
import type { SubscriptionCardModel } from './SubscriptionHeaderCard';

type Props = {
    subscription: SubscriptionCardModel;
    token: string;
    onUnauthorized: () => void;
    onCancelled: (subscription: SubscriptionCardModel) => void;
    onKeepTracking: () => void;
};

const SubscriptionCancelCard: React.FC<Props> = ({
    subscription,
    token,
    onUnauthorized,
    onCancelled,
    onKeepTracking,
}) => {
    const [providerCancelled, setProviderCancelled] = useState<boolean | null>(null);
    const [cancellationDate, setCancellationDate] = useState('');
    const [accessEndsAt, setAccessEndsAt] = useState(subscription.nextBillingDate ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleMarkCancelled = async () => {
        if (providerCancelled !== true) {
            setError('Confirm that you cancelled the subscription with the provider first.');
            return;
        }
        if (!cancellationDate) {
            setError('Enter the date you cancelled with the provider.');
            return;
        }
        if (isAfterToday(cancellationDate)) {
            setError("The provider cancellation date can't be in the future.");
            return;
        }
        if (subscription.startedAt && cancellationDate < subscription.startedAt) {
            setError("The provider cancellation date can't be before the subscription started.");
            return;
        }
        if (accessEndsAt && accessEndsAt < cancellationDate) {
            setError("Access can't end before the provider cancellation date.");
            return;
        }

        try {
            setSaving(true);
            setError('');

            const payload = {
                serviceName: subscription.serviceName,
                amount: Number(subscription.amount),
                currency: subscription.currency,
                billingCadence: subscription.billingCadence,
                category: subscription.category,
                startedAt: subscription.startedAt ?? null,
                nextBillingDate: accessEndsAt || null,
                notes: subscription.notes,
                paymentMethod: subscription.paymentMethod ?? null,
                status: 'cancelled',
                autoRenew: false,
                b2b: subscription.b2b,
                householdShared: subscription.householdShared ?? false,
                householdSize: subscription.householdSize ?? null,
                cancelledAt: cancellationDate,
                trialEndsAt: subscription.trialEndsAt ?? null,
            };

            const response = await fetch(`${API_URL}/api/subs/${subscription.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                onUnauthorized();
                return;
            }
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to update the subscription.');
            }

            onCancelled(data ?? {
                ...subscription,
                status: 'cancelled',
                autoRenew: false,
                cancelledAt: cancellationDate,
                nextBillingDate: accessEndsAt || null,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper className="subscription-review-panel subscription-cancel-panel">
            <div className="subscription-review-stepper" aria-label="Cancellation step">
                <span className="current">01 <small>Review</small></span>
                <i aria-hidden="true" />
                <span>02 <small>Confirm provider cancellation</small></span>
            </div>

            <Stack spacing={2.25}>
                <Box>
                    <span className="subscription-review-kicker">CANCELLATION REVIEW</span>
                    <Typography component="h2" className="subscription-review-title">
                        Have you cancelled {subscription.serviceName} with the provider?
                    </Typography>
                    <Typography className="subscription-review-copy">
                        ValuTir can update your record, but it cannot cancel a provider plan for you. Keep tracking this subscription until the provider confirms cancellation.
                    </Typography>
                </Box>

                <FormControl>
                    <FormLabel className="subscription-cancel-question">Provider cancellation status</FormLabel>
                    <RadioGroup
                        row
                        value={providerCancelled === null ? '' : String(providerCancelled)}
                        onChange={(event) => {
                            setProviderCancelled(event.target.value === 'true');
                            setError('');
                        }}
                    >
                        <FormControlLabel value="true" control={<Radio size="small" />} label="Yes, cancelled with provider" />
                        <FormControlLabel value="false" control={<Radio size="small" />} label="Not yet" />
                    </RadioGroup>
                </FormControl>

                {providerCancelled === true && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                        label="Provider cancellation date"
                        type="date"
                        value={cancellationDate}
                        onChange={(event) => setCancellationDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        // You can only have cancelled already (today or earlier), and not before it started.
                        inputProps={{ min: subscription.startedAt ?? undefined, max: todayIsoDate() }}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Access ends (optional)"
                        type="date"
                        value={accessEndsAt}
                        onChange={(event) => setAccessEndsAt(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        // Access may run into the future, but can't end before the cancellation.
                        inputProps={{ min: cancellationDate || undefined }}
                        helperText="Keeps the final access date on this record."
                        fullWidth
                    />
                </Stack>}

                {providerCancelled === false && <Alert severity="info" className="subscription-cancel-info">
                    Cancel with the provider first. You can return here afterward to mark this record cancelled.
                </Alert>}
                {error && <Alert severity="error">{error}</Alert>}

                <div className="subscription-review-footer">
                    <Button variant="outlined" color="inherit" disabled={saving} onClick={onKeepTracking}>
                        Keep in tracker
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<CancelOutlinedIcon />}
                        disabled={saving || providerCancelled !== true || !cancellationDate}
                        onClick={() => void handleMarkCancelled()}
                    >
                        {saving ? 'Saving...' : 'Mark as cancelled'}
                    </Button>
                </div>
            </Stack>
        </Paper>
    );
};

export default SubscriptionCancelCard;
