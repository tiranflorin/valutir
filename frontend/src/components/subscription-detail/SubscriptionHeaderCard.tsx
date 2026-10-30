import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

export type SubscriptionCardModel = {
    id: number;
    serviceName: string;
    category: string | null;
    amount: number;
    currency: string;
    billingCadence: string;
    nextBillingDate: string | null;
    notes: string | null;
    status: string;
    autoRenew: boolean;
    b2b: boolean;
    cancelledAt: string | null;
    startedAt?: string | null;
    paymentMethod?: string | null;
    trialEndsAt?: string | null;
    trialReminderSentAt?: string | null;
};

type Props = {
    subscription: SubscriptionCardModel;
    isEditMode: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onStartCancel?: () => void;
};

const formatBillingCadence = (value: string) => {
    if (!value) return 'Unknown';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const SubscriptionHeaderCard: React.FC<Props> = ({
                                                     subscription,
                                                     isEditMode,
                                                     onStartEdit,
                                                     onCancelEdit,
                                                     onStartCancel,
                                                 }) => {
    return (
        <Paper className="subscription-detail-hero">
            <Stack
                className="subscription-detail-hero-layout"
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
            >
                <Box className="subscription-detail-hero-copy">
                    {/*<span className="subscription-detail-kicker">SUBSCRIPTION</span>*/}
                    <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>
                        {subscription.serviceName}
                    </Typography>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                        <Chip
                            label={subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                            color={subscription.status === 'active' ? 'success' : 'default'}
                            sx={{ fontWeight: 700 }}
                        />
                        {subscription.autoRenew && (
                            <Chip label="Auto renew" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        )}
                        <Chip
                            label={subscription.category ?? 'Uncategorized'}
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                        />
                        <Chip
                            label={formatBillingCadence(subscription.billingCadence)}
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                        />
                    </Stack>

                    <Typography component="p" variant="h5" className="subscription-detail-cost" sx={{ fontWeight: 800 }}>
                        {Number(subscription.amount).toFixed(2)} {subscription.currency}
                        <small> / {formatBillingCadence(subscription.billingCadence)}</small>
                    </Typography>
                </Box>

                {subscription.status !== 'cancelled' && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} className="subscription-detail-actions">
                        <Button
                            variant="contained"
                            startIcon={<EditRoundedIcon />}
                            onClick={isEditMode ? onCancelEdit : onStartEdit}
                            className="subscription-edit-button"
                        >
                            {isEditMode ? 'Cancel editing' : 'Edit subscription'}
                        </Button>
                        {!isEditMode && onStartCancel && <Button
                            variant="outlined"
                            startIcon={<CancelOutlinedIcon />}
                            onClick={onStartCancel}
                            className="subscription-cancel-button"
                        >
                            Cancel subscription
                        </Button>}
                    </Stack>
                )}
            </Stack>
        </Paper>
    );
};

export default SubscriptionHeaderCard;
