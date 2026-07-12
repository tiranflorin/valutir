import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import AppSurfaceCard from '../components/AppSurfaceCard';
import { useAuth } from '../context/AuthContext';
import { VITE_API_URL } from '../services/auth';

type Subscription = {
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

const SubscriptionDetailPage: React.FC = () => {
    const theme = useTheme();
    const { subscriptionId } = useParams();
    const { token, logout } = useAuth();

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadSubscription = async () => {
            if (!token) {
                setError('You are not authenticated.');
                setLoading(false);
                return;
            }

            if (!subscriptionId) {
                setError('Missing subscription id.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');

                const response = await fetch(`${VITE_API_URL}/api/subs/${subscriptionId}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json().catch(() => null);

                if (response.status === 401) {
                    logout();
                    return;
                }

                if (!response.ok) {
                    throw new Error(data?.message || 'Failed to load subscription.');
                }

                setSubscription(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong.');
            } finally {
                setLoading(false);
            }
        };

        loadSubscription();
    }, [token, subscriptionId, logout]);

    return (
        <AppShell mode="content" maxWidth="lg">
            <AppHeader />

            <Box sx={{ pt: 4, pb: 6 }}>
                <Button
                    component={RouterLink}
                    to="/my-subs"
                    startIcon={<ArrowBackRoundedIcon />}
                    variant="text"
                    sx={{ mb: 3, fontWeight: 700 }}
                >
                    Back to My Subs
                </Button>

                {loading && (
                    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                )}

                {!loading && error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {!loading && subscription && (
                    <Stack spacing={3}>
                        <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                justifyContent="space-between"
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                            >
                                <Box>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                                        <Typography variant="h4" fontWeight={800}>
                                            {subscription.serviceName}
                                        </Typography>
                                        <Chip
                                            label={subscription.isActive ? 'Active' : 'Inactive'}
                                            color={subscription.isActive ? 'success' : 'default'}
                                            size="small"
                                        />
                                        {subscription.autoRenew && (
                                            <Chip label="Auto-renew" color="primary" size="small" variant="outlined" />
                                        )}
                                    </Stack>

                                    <Typography variant="body1" color="text.secondary">
                                        {subscription.category ?? 'Uncategorized'} · {subscription.billingCadence}
                                    </Typography>
                                </Box>

                                <Typography variant="h5" fontWeight={800}>
                                    {Number(subscription.amount).toFixed(2)} {subscription.currency}
                                </Typography>
                            </Stack>
                        </AppSurfaceCard>

                        <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
                            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                                Details
                            </Typography>

                            <Stack spacing={2.5}>
                                <DetailRow label="Next billing date" value={subscription.nextBillingDate || '—'} />
                                <Divider />
                                <DetailRow label="Cancelled at" value={subscription.cancelledAt || '—'} />
                                <Divider />
                                <DetailRow label="Notes" value={subscription.notes || 'No notes added.'} />
                                <Divider />
                                <DetailRow label="Subscription ID" value={String(subscription.id)} />
                            </Stack>
                        </AppSurfaceCard>
                    </Stack>
                )}
            </Box>
        </AppShell>
    );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
        <Typography variant="body2" color="text.secondary" fontWeight={700}>
            {label}
        </Typography>
        <Typography variant="body1" fontWeight={600}>
            {value}
        </Typography>
    </Stack>
);

export default SubscriptionDetailPage;
