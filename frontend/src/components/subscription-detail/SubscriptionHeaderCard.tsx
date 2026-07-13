import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AppSurfaceCard from '../AppSurfaceCard';

export type SubscriptionCardModel = {
    id: number;
    serviceName: string;
    category: string | null;
    amount: number;
    currency: string;
    billingCadence: string;
    nextBillingDate: string | null;
    notes: string | null;
    isActive: boolean;
    autoRenew: boolean;
    cancelledAt: string | null;
};

type Props = {
    subscription: SubscriptionCardModel;
    isEditMode: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
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
                                                 }) => {
    return (
        <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {subscription.serviceName}
                    </Typography>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                        <Chip
                            label={subscription.isActive ? 'Active' : 'Inactive'}
                            color={subscription.isActive ? 'success' : 'default'}
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

                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 2 }}>
                        {Number(subscription.amount).toFixed(2)} {subscription.currency}
                    </Typography>
                </Box>

                {subscription.isActive && (
                    <Button
                        variant={isEditMode ? 'outlined' : 'contained'}
                        color={isEditMode ? 'inherit' : 'primary'}
                        startIcon={isEditMode ? <CloseRoundedIcon /> : <EditRoundedIcon />}
                        onClick={isEditMode ? onCancelEdit : onStartEdit}
                        sx={{ borderRadius: 999, px: 3, fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                        {isEditMode ? 'Cancel editing' : 'Edit subscription'}
                    </Button>
                )}
            </Stack>
        </AppSurfaceCard>
    );
};

export default SubscriptionHeaderCard;
