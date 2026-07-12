import React, { useMemo, useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import AppSurfaceCard from './AppSurfaceCard';

export type OverviewCurrency = 'EUR' | 'USD' | 'RON';
export type OverviewInterval = 'monthly' | 'yearly';

export type OverviewSubscription = {
    id: number;
    serviceName: string;
    amount: number;
    currency: string;
    billingCadence: string;
    isActive: boolean;
    cancelledAt: string | null;
};

type Props = {
    subscriptions: OverviewSubscription[];
};

const intervalOptions: { label: string; value: OverviewInterval }[] = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
];

const currencyOptions: OverviewCurrency[] = ['EUR', 'USD', 'RON'];

/**
 * Simple placeholder rates for now.
 * Base reference: EUR.
 */
const FX_RATES: Record<OverviewCurrency, number> = {
    EUR: 1,
    USD: 1.09,
    RON: 4.97,
};

const normalizeToMonthly = (amount: number, billingCadence: string) => {
    const cadence = billingCadence.toLowerCase();

    if (cadence === 'monthly') return amount;
    if (cadence === 'yearly') return amount / 12;
    if (cadence === 'quarterly') return amount / 3;
    if (cadence === 'weekly') return (amount * 52) / 12;

    return amount;
};

const convertCurrency = (
    amount: number,
    fromCurrency: string,
    toCurrency: OverviewCurrency
) => {
    const from = fromCurrency.toUpperCase() as OverviewCurrency;

    if (!FX_RATES[from]) {
        return amount;
    }

    const amountInEur = amount / FX_RATES[from];
    return amountInEur * FX_RATES[toCurrency];
};

const formatRatio = (value: number) => {
    if (value < 10) return `${value.toFixed(1)}%`;
    return `${value.toFixed(0)}%`;
};

const formatMoney = (value: number, currency: OverviewCurrency) =>
    new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(value);

const SubscriptionsOverviewCard: React.FC<Props> = ({ subscriptions }) => {
    const [interval, setInterval] = useState<OverviewInterval>('monthly');
    const [currency, setCurrency] = useState<OverviewCurrency>('EUR');

    const activeSubscriptions = useMemo(
        () => subscriptions.filter((subscription) => subscription.isActive),
        [subscriptions]
    );

    const cancelledSubscriptions = useMemo(
        () => subscriptions.filter((subscription) => !subscription.isActive),
        [subscriptions]
    );

    const totals = useMemo(() => {
        const activeBase = activeSubscriptions.reduce((sum, subscription) => {
            const monthly = normalizeToMonthly(subscription.amount, subscription.billingCadence);
            const converted = convertCurrency(monthly, subscription.currency, currency);
            return sum + converted;
        }, 0);

        const cancelledBase = cancelledSubscriptions.reduce((sum, subscription) => {
            const monthly = normalizeToMonthly(subscription.amount, subscription.billingCadence);
            const converted = convertCurrency(monthly, subscription.currency, currency);
            return sum + converted;
        }, 0);

        const multiplier = interval === 'yearly' ? 12 : 1;

        const activeSpend = activeBase * multiplier;
        const cancelledSavings = cancelledBase * multiplier;

        const savingsVsActiveSpendRatio =
            activeSpend > 0 ? (cancelledSavings / activeSpend) * 100 : 0;

        return {
            totalSubscriptions: subscriptions.length,
            activeCount: activeSubscriptions.length,
            cancelledCount: cancelledSubscriptions.length,
            activeSpend,
            cancelledSavings,
            savingsVsActiveSpendRatio,
        };
    }, [subscriptions, activeSubscriptions, cancelledSubscriptions, currency, interval]);

    return (
        <AppSurfaceCard
            sx={{
                width: '100%',
                p: { xs: 3, md: 4 },
            }}
        >
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Overview
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Review your live subscription footprint and what you are already saving by cancelling unused ones.
                    </Typography>
                </Box>

                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {intervalOptions.map((option) => (
                            <Chip
                                key={option.value}
                                label={option.label}
                                clickable
                                color={interval === option.value ? 'primary' : 'default'}
                                onClick={() => setInterval(option.value)}
                                sx={{ fontWeight: 700, borderRadius: 999 }}
                            />
                        ))}
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {currencyOptions.map((option) => (
                            <Chip
                                key={option}
                                label={option}
                                clickable
                                color={currency === option ? 'secondary' : 'default'}
                                onClick={() => setCurrency(option)}
                                sx={{ fontWeight: 700, borderRadius: 999 }}
                            />
                        ))}
                    </Stack>
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
                        gap: 2,
                    }}
                >
                    <MetricCard
                        label="Total subscriptions"
                        value={String(totals.totalSubscriptions)}
                        helper={`${totals.activeCount} active · ${totals.cancelledCount} cancelled`}
                    />

                    <MetricCard
                        label={`Active spend / ${interval === 'monthly' ? 'month' : 'year'}`}
                        value={formatMoney(totals.activeSpend, currency)}
                        helper="Normalized across billing cadences"
                    />

                    <MetricCard
                        label={`Saved by cancelling / ${interval === 'monthly' ? 'month' : 'year'}`}
                        value={formatMoney(totals.cancelledSavings, currency)}
                        helper="Based on inactive subscriptions"
                    />

                    <MetricCard
                        label="Savings vs active spend"
                        value={formatRatio(totals.savingsVsActiveSpendRatio)}
                        helper={
                            totals.cancelledSavings > 0
                                ? `You already cut ${formatRatio(totals.savingsVsActiveSpendRatio)} of your current recurring spend.`
                                : 'No savings from cancelled subscriptions yet.'
                        }
                    />
                </Box>
            </Stack>
        </AppSurfaceCard>
    );
};

const MetricCard: React.FC<{
    label: string;
    value: string;
    helper: string;
}> = ({ label, value, helper }) => {
    return (
        <Box
            sx={{
                p: 2.25,
                borderRadius: 3,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.75 }}>
                {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {helper}
            </Typography>
        </Box>
    );
};

export default SubscriptionsOverviewCard;