import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ManageLinkNote from '../ManageLinkNote';
import type { SubscriptionCardModel } from '../../types/subscription';
import ServiceIcon from '../ServiceIcon';
import { safeManageUrl } from '../../utils/manageUrl';


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

const statusChipLabel = ({ status, resumesOn }: SubscriptionCardModel) => {
    if (status === 'paused') {
        return resumesOn
            ? `Paused until ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${resumesOn}T00:00:00`))}`
            : 'Paused';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
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
                    <Box className="service-heading">
                        <ServiceIcon serviceName={subscription.serviceName} size="lg" />
                        <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>
                            {subscription.serviceName}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                        <Chip
                            label={statusChipLabel(subscription)}
                            color={subscription.status === 'active' ? 'success' : subscription.status === 'paused' ? 'warning' : 'default'}
                            sx={{ fontWeight: 700 }}
                        />
                        {subscription.reviewFlagged && (
                            <Chip label="Flagged for review" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
                        )}
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
                    {safeManageUrl(subscription.manageUrl) && (
                        <div className="manage-link-block">
                            <a className="manage-link" href={safeManageUrl(subscription.manageUrl)!} target="_blank" rel="noopener noreferrer">
                                {subscription.status === 'cancelled' ? 'Your account with the provider' : 'Manage or cancel with the provider'}
                                <OpenInNewRoundedIcon fontSize="inherit" aria-hidden="true" />
                                <span className="visually-hidden"> (opens in a new tab)</span>
                            </a>
                            <ManageLinkNote />
                        </div>
                    )}
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
