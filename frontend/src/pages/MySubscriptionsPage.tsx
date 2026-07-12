import React, { useEffect, useState } from 'react';
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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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

const formatBillingCadence = (value: string) => {
    if (!value) return 'Unknown';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const MySubscriptionsPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <AppShell mode="content" maxWidth="lg">
            <AppHeader />

            <Box
                sx={{
                    width: '100%',
                    maxWidth: 1200,
                    mx: 'auto',
                    px: { xs: 2, sm: 3, md: 4 },
                    py: { xs: 3, md: 4 },
                }}
            >
                <Stack spacing={3}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        spacing={2}
                    >
                        <Box sx={{ maxWidth: 760 }}>
                            <Typography variant="h3" fontWeight={800} gutterBottom>
                                My Subs
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
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

                    {loading && (
                        <Box display="flex" justifyContent="center" py={6}>
                            <CircularProgress />
                        </Box>
                    )}

                    {error && <Alert severity="error">{error}</Alert>}

                    {!loading && !error && subscriptions.length === 0 && (
                        <AppSurfaceCard>
                            <Stack spacing={1}>
                                <Typography variant="h6" fontWeight={700}>
                                    No subscriptions yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Add your first recurring payment to start tracking it.
                                </Typography>
                            </Stack>
                        </AppSurfaceCard>
                    )}

                    {!loading &&
                        !error &&
                        subscriptions.map((subscription) => (
                            <AppSurfaceCard key={subscription.id}>
                                <CardActionArea
                                    component={RouterLink}
                                    to={`/subscriptions/${subscription.id}`}
                                    sx={{ borderRadius: 'inherit' }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                        justifyContent="space-between"
                                        spacing={2}
                                        sx={{ p: 2.25 }}
                                    >
                                        <Stack
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                            sx={{ minWidth: 0, flex: 1 }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 2.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: 'background.paper',
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <ConfirmationNumberOutlinedIcon fontSize="small" />
                                            </Box>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography fontWeight={700} noWrap>
                                                    {subscription.serviceName}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" noWrap>
                                                    {subscription.category ?? 'Uncategorized'} · {formatBillingCadence(subscription.billingCadence)}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Stack
                                            direction="row"
                                            spacing={1.25}
                                            alignItems="center"
                                            sx={{ flexShrink: 0 }}
                                        >
                                            <Chip
                                                label={subscription.isActive ? 'Active' : 'Inactive'}
                                                size="small"
                                                color={subscription.isActive ? 'success' : 'default'}
                                            />

                                            <Typography fontWeight={700} whiteSpace="nowrap">
                                                {Number(subscription.amount).toFixed(2)} {subscription.currency}
                                            </Typography>

                                            <ChevronRightRoundedIcon color="action" />
                                        </Stack>
                                    </Stack>
                                </CardActionArea>
                            </AppSurfaceCard>
                        ))}
                </Stack>
            </Box>
        </AppShell>
    );
};

export default MySubscriptionsPage;