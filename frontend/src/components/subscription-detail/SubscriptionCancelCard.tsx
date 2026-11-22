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
    Typography,
} from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useAuth } from '../../context/AuthContext';
import { useAccountErrorHandler } from '../../hooks/useAccountErrorHandler';
import { isAfterToday, todayIsoDate } from '../../utils/dates';
import ManageLinkNote from '../ManageLinkNote';
import { safeManageUrl } from '../../utils/manageUrl';
import { updateSubscription } from '../../services/subscriptions';
import type { SubscriptionCardModel, SubscriptionRecord } from '../../types/subscription';
import DateField from '../DateField';

type Props = {
    subscription: SubscriptionCardModel;
    onCancelled: (subscription: SubscriptionRecord) => void;
    onKeepTracking: () => void;
};

const SubscriptionCancelCard: React.FC<Props> = ({
    subscription,
    onCancelled,
    onKeepTracking,
}) => {
    const { token } = useAuth();
    const errorMessage = useAccountErrorHandler();
    const [providerCancelled, setProviderCancelled] = useState<boolean | null>(null);
    const [cancellationDate, setCancellationDate] = useState('');
    const [accessEndsAt, setAccessEndsAt] = useState(subscription.nextBillingDate ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const manageUrl = safeManageUrl(subscription.manageUrl);
    const providerLink = manageUrl && (
        <a className="manage-link" href={manageUrl} target="_blank" rel="noopener noreferrer">
            Cancel with {subscription.serviceName}<span className="visually-hidden"> (opens in a new tab)</span> ↗
        </a>
    );

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

            onCancelled(await updateSubscription(token, subscription, {
                status: 'cancelled',
                autoRenew: false,
                cancelledAt: cancellationDate,
                nextBillingDate: accessEndsAt || null,
            }));
        } catch (err) {
            const message = errorMessage(err);
            if (message !== null) setError(message);
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
                    {providerLink && (
                        <div className="manage-link-block">
                            <Typography component="p" sx={{ mt: 1 }}>{providerLink}</Typography>
                            <ManageLinkNote />
                        </div>
                    )}
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
                    <DateField
                        label="Provider cancellation date"
                        value={cancellationDate}
                        onChange={(event) => setCancellationDate(event.target.value)}
                        // You can only have cancelled already (today or earlier), and not before it started.
                        inputProps={{ min: subscription.startedAt ?? undefined, max: todayIsoDate() }}
                        fullWidth
                        required
                    />
                    <DateField
                        label="Access ends (optional)"
                        value={accessEndsAt}
                        onChange={(event) => setAccessEndsAt(event.target.value)}
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
