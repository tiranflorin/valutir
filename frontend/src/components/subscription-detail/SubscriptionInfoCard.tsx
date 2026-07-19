import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import AppSurfaceCard from '../AppSurfaceCard';
import type { SubscriptionCardModel } from './SubscriptionHeaderCard';

type Props = {
    subscription: SubscriptionCardModel;
};

const formatDate = (value: string | null) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <Box>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
    </Box>
);

const SubscriptionInfoCard: React.FC<Props> = ({ subscription }) => {
    return (
        <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2.25}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Subscription details
                </Typography>

                <Divider />

                <DetailRow label="Category" value={subscription.category ?? '—'} />
                <DetailRow label="Billing cadence" value={subscription.billingCadence || '—'} />
                <DetailRow label="Next billing date" value={formatDate(subscription.nextBillingDate)} />
                <DetailRow label="Auto renew" value={subscription.autoRenew ? 'Yes' : 'No'} />
                <DetailRow label="Notes" value={subscription.notes ?? '—'} />
                {subscription.status === 'cancelled' && (
                    <DetailRow label="Cancelled at" value={formatDate(subscription.cancelledAt)} />
                )}
            </Stack>
        </AppSurfaceCard>
    );
};

export default SubscriptionInfoCard;
