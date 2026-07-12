import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CardActionArea,
    Chip,
    CircularProgress,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import AppSurfaceCard from '../components/AppSurfaceCard';
import { useAuth } from '../context/AuthContext';
import { VITE_API_URL } from '../services/auth';
import SubscriptionsOverviewCard from '../components/SubscriptionsOverviewCard';

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

const formatBillingCadence = (value: string) => {
    if (!value) return 'Unknown';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const formatDate = (value: string | null) => {
    if (!value) return 'Unknown date';

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

const MySubscriptionsPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { token, logout } = useAuth();

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const deletedSubscriptionMessage =
        (location.state as { deletedSubscriptionMessage?: string } | null)?.deletedSubscriptionMessage ?? '';

    useEffect(() => {
        const loadSubscriptions = async () => {
            if (!token) {
                setLoading(false);
                setError('You are not authenticated.');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`${VITE_API_URL}/api/subs`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json().catch(() => null);

                if (!response.ok) {
                    if (response.status === 401) {
                        logout();
                        navigate('/login', { replace: true });
                        return;
                    }

                    throw new Error(data?.message || 'Failed to load subscriptions.');
                }

                setSubscriptions(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong.');
            } finally {
                setLoading(false);
            }
        };

        loadSubscriptions();
    }, [token, logout, navigate]);

    const activeSubscriptions = useMemo(
        () => subscriptions.filter((subscription) => subscription.isActive),
        [subscriptions]
    );

    const cancelledSubscriptions = useMemo(
        () => subscriptions.filter((subscription) => !subscription.isActive),
        [subscriptions]
    );

    return (
        <AppShell mode="content" maxWidth="lg">
            <AppHeader />

            <Stack spacing={3} sx={{ mt: { xs: 4, md: 6 }, width: '100%' }}>
                <AppSurfaceCard
                    sx={{
                        width: '100%',
                        p: { xs: 3, md: 4 },
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                    >
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                Manage my Subs
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                                Start with a clean overview of your recurring payments and open any subscription in one click.
                            </Typography>
                        </Box>

                        <Button
                            component={RouterLink}
                            to="/subscriptions/new"
                            startIcon={<AddOutlinedIcon />}
                            sx={{
                                borderRadius: 999,
                                px: 2.5,
                                py: 1.25,
                                fontWeight: 700,
                                color: theme.palette.common.white,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                boxShadow: `0 12px 28px ${theme.palette.primary.main}33`,
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                                },
                            }}
                        >
                            Add subscription
                        </Button>
                    </Stack>
                </AppSurfaceCard>

                {deletedSubscriptionMessage && (
                    <Alert severity="success">{deletedSubscriptionMessage}</Alert>
                )}

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && <Alert severity="error">{error}</Alert>}

                {!loading && !error && subscriptions.length === 0 && (
                    <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={1.25} alignItems="flex-start">
                            <ConfirmationNumberOutlinedIcon color="disabled" />
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                No subscriptions yet
                            </Typography>
                            <Typography color="text.secondary">
                                Add your first recurring payment to start tracking it.
                            </Typography>
                        </Stack>
                    </AppSurfaceCard>
                )}

                {!loading && !error && subscriptions.length > 0 && (
                    <SubscriptionsOverviewCard subscriptions={subscriptions} />
                )}

                {!loading && !error && activeSubscriptions.length > 0 && (
                    <Stack spacing={2}>
                        <Box sx={{ px: { xs: 0.5, md: 0 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                Active subscriptions
                            </Typography>
                            <Typography color="text.secondary">
                                These are currently active and should stay at the top of your review.
                            </Typography>
                        </Box>

                        {activeSubscriptions.map((subscription) => (
                            <AppSurfaceCard key={subscription.id} sx={{ overflow: 'hidden' }}>
                                <CardActionArea
                                    component={RouterLink}
                                    to={`/subscriptions/${subscription.id}`}
                                    sx={{
                                        p: { xs: 2.25, md: 3 },
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={2}
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                        justifyContent="space-between"
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                                                <Chip
                                                    label="Active"
                                                    color="success"
                                                    size="small"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                                {subscription.autoRenew && (
                                                    <Chip
                                                        label="Auto renew"
                                                        color="primary"
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                )}
                                            </Stack>

                                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                {subscription.serviceName}
                                            </Typography>

                                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                                {subscription.category ?? 'Uncategorized'} · {formatBillingCadence(subscription.billingCadence)}
                                            </Typography>

                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                                Next billing: {formatDate(subscription.nextBillingDate)}
                                            </Typography>
                                        </Box>

                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            alignItems="center"
                                            sx={{ ml: { md: 2 }, alignSelf: { xs: 'stretch', md: 'center' } }}
                                        >
                                            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                    {Number(subscription.amount).toFixed(2)} {subscription.currency}
                                                </Typography>
                                            </Box>

                                            <ChevronRightRoundedIcon color="action" />
                                        </Stack>
                                    </Stack>
                                </CardActionArea>
                            </AppSurfaceCard>
                        ))}
                    </Stack>
                )}

                {!loading && !error && cancelledSubscriptions.length > 0 && (
                    <Stack spacing={2} sx={{ pt: { xs: 2, md: 3 } }}>
                        <Box sx={{ px: { xs: 0.5, md: 0 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                Cancelled subscriptions
                            </Typography>
                            <Typography color="text.secondary">
                                Keep these visible for context, including when they were cancelled.
                            </Typography>
                        </Box>

                        {cancelledSubscriptions.map((subscription) => (
                            <AppSurfaceCard
                                key={subscription.id}
                                sx={{
                                    overflow: 'hidden',
                                    opacity: 0.9,
                                }}
                            >
                                <CardActionArea
                                    component={RouterLink}
                                    to={`/subscriptions/${subscription.id}`}
                                    sx={{
                                        p: { xs: 2.25, md: 3 },
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={2}
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                        justifyContent="space-between"
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                                                <Chip
                                                    label="Cancelled"
                                                    color="default"
                                                    size="small"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </Stack>

                                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                {subscription.serviceName}
                                            </Typography>

                                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                                {subscription.category ?? 'Uncategorized'} · {formatBillingCadence(subscription.billingCadence)}
                                            </Typography>

                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                                Cancelled on: {formatDate(subscription.cancelledAt)}
                                            </Typography>
                                        </Box>

                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            alignItems="center"
                                            sx={{ ml: { md: 2 }, alignSelf: { xs: 'stretch', md: 'center' } }}
                                        >
                                            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                    {Number(subscription.amount).toFixed(2)} {subscription.currency}
                                                </Typography>
                                            </Box>

                                            <ChevronRightRoundedIcon color="action" />
                                        </Stack>
                                    </Stack>
                                </CardActionArea>
                            </AppSurfaceCard>
                        ))}
                    </Stack>
                )}
            </Stack>
        </AppShell>
    );
};

export default MySubscriptionsPage;
