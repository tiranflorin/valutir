import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { SubscriptionCardModel } from './SubscriptionHeaderCard';
import { shareOf, splitCount } from '../../utils/householdShare';

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

const DetailRow: React.FC<{ label: string; value: string; helper?: string }> = ({ label, value, helper }) => (
    <Box className="subscription-detail-item">
        <Typography component="span" variant="body2" color="text.secondary">{label}</Typography>
        <Typography component="strong">{value}</Typography>
        {helper && <Typography component="small">{helper}</Typography>}
    </Box>
);

const formatMoney = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'EUR' }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency || 'EUR'}`;
    }
};

const SubscriptionInfoCard: React.FC<Props> = ({ subscription }) => {
    const people = splitCount(subscription);

    return (
        <Paper className="subscription-info-panel">
            <div className="subscription-info-heading">
                <h2>Subscription details</h2>
                <p>Billing and account context</p>
            </div>
            <div className="subscription-detail-grid">
                <DetailRow label="Category" value={subscription.category ?? 'Uncategorized'} />
                <DetailRow label="Billing cadence" value={subscription.billingCadence || '—'} />
                <DetailRow label="Next billing date" value={formatDate(subscription.nextBillingDate)} />
                <DetailRow label="Auto renew" value={subscription.autoRenew ? 'On' : 'Off'} />
                <DetailRow label="Subscription view" value={subscription.b2b ? 'Business' : 'Personal'} />
                {!subscription.b2b && (
                    <DetailRow
                        label="Household shared"
                        value={people > 1 ? `Yes · split between ${people}` : 'No'}
                        helper={people > 1 ? `Your share: ${formatMoney(shareOf(Number(subscription.amount) || 0, subscription), subscription.currency)} per ${subscription.billingCadence} bill` : undefined}
                    />
                )}
                <DetailRow label="Notes" value={subscription.notes?.trim() || '—'} />
                {subscription.status === 'cancelled' && (
                    <DetailRow label="Cancelled at" value={formatDate(subscription.cancelledAt)} />
                )}
            </div>
        </Paper>
    );
};

export default SubscriptionInfoCard;
