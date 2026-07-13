import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
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
    const navigate = useNavigate();
    const { subscriptionId } = useParams();
    const { token, logout } = useAuth();

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [usedAndUseful, setUsedAndUseful] = useState<boolean | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [wasReenabled, setWasReenabled] = useState<boolean | null>(null);
    const [reenabledFromDate, setReenabledFromDate] = useState('');
    const [reenabledPrice, setReenabledPrice] = useState('');
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');

    useEffect(() => {
        const loadSubscription = async () => {
            if (!token) {
                setError('You are not authenticated.');
                setLoading(false);
                return;
            }

            if (!subscriptionId || subscriptionId === 'new') {
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
                    navigate('/login', { replace: true });
                    return;
                }

                if (!response.ok) {
                    throw new Error(data?.message || 'Failed to load subscription.');
                }

                setSubscription(data);
                setReenabledPrice(String(data?.amount ?? ''));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong.');
            } finally {
                setLoading(false);
            }
        };

        loadSubscription();
    }, [token, subscriptionId, logout, navigate]);

    const formattedStatus = useMemo(() => {
        if (!subscription) return '';
        return subscription.isActive ? 'Active' : 'Inactive';
    }, [subscription]);

    const handleDelete = async () => {
        if (!token || !subscriptionId) {
            setDeleteError('Missing authentication or subscription id.');
            return;
        }

        if (usedAndUseful === null) {
            setDeleteError('Please answer whether this subscription was actually used and useful.');
            return;
        }

        try {
            setDeleting(true);
            setDeleteError('');

            const response = await fetch(`${VITE_API_URL}/api/subs/${subscriptionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    usedAndUseful,
                }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                logout();
                navigate('/login', { replace: true });
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to delete subscription.');
            }

            navigate('/my-subs', {
                replace: true,
                state: {
                    deletedSubscriptionMessage: usedAndUseful
                        ? 'Subscription removed and marked as useful before cleanup.'
                        : 'Subscription removed and marked as not useful before cleanup.',
                },
            });
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setDeleting(false);
        }
    };

    const handleReenable = async () => {
        if (!token || !subscriptionId || !subscription) {
            setUpdateError('Missing authentication or subscription id.');
            return;
        }

        if (wasReenabled !== true) {
            setUpdateError('Please confirm that the subscription was re-enabled.');
            return;
        }

        if (!reenabledFromDate) {
            setUpdateError('Please provide the re-enabled date.');
            return;
        }

        if (!reenabledPrice || Number(reenabledPrice) <= 0) {
            setUpdateError('Please provide a valid re-enabled price.');
            return;
        }

        try {
            setUpdating(true);
            setUpdateError('');

            const response = await fetch(`${VITE_API_URL}/api/subs/${subscriptionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    serviceName: subscription.serviceName,
                    category: subscription.category,
                    amount: Number(reenabledPrice),
                    currency: subscription.currency,
                    billingCadence: subscription.billingCadence,
                    nextBillingDate: subscription.nextBillingDate,
                    notes: subscription.notes,
                    isActive: true,
                    autoRenew: true,
                    cancelledAt: null,
                    startedAt: reenabledFromDate,
                }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                logout();
                navigate('/login', { replace: true });
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to re-enable subscription.');
            }

            navigate('/my-subs', {
                replace: true,
                state: {
                    deletedSubscriptionMessage: 'Subscription re-enabled successfully.',
                },
            });
        } catch (err) {
            setUpdateError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <AppShell centered={false} maxWidth="lg" showThemeToggle={false}>
            <AppHeader />

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
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
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
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {subscription.serviceName}
                                </Typography>

                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                    <Chip
                                        label={formattedStatus}
                                        color={subscription.isActive ? 'success' : 'default'}
                                    />
                                    {subscription.autoRenew && <Chip label="Auto renew" color="primary" />}
                                </Stack>
                            </Box>

                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                {Number(subscription.amount).toFixed(2)} {subscription.currency}
                            </Typography>

                            <Divider />

                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Details
                            </Typography>

                            <DetailRow label="Category" value={subscription.category ?? '—'} />
                            <DetailRow label="Billing cadence" value={subscription.billingCadence} />
                            <DetailRow label="Next billing date" value={subscription.nextBillingDate ?? '—'} />
                            <DetailRow label="Notes" value={subscription.notes ?? '—'} />
                            <DetailRow label="Cancelled at" value={subscription.cancelledAt ?? '—'} />
                        </Stack>
                    </AppSurfaceCard>

                    {subscription.isActive ? (
                        <AppSurfaceCard
                            sx={{
                                p: { xs: 3, md: 4 },
                                border: `1px solid ${theme.palette.error.light}`,
                            }}
                        >
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                        Delete subscription
                                    </Typography>
                                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                        Before removing it from your active list, tell us whether it was actually used and useful for you.
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                                        Was this sub actually used and useful for you?
                                    </Typography>

                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        <Chip
                                            label="Yes"
                                            clickable
                                            color={usedAndUseful === true ? 'success' : 'default'}
                                            onClick={() => setUsedAndUseful(true)}
                                            sx={{ fontWeight: 700, borderRadius: 999 }}
                                        />
                                        <Chip
                                            label="No"
                                            clickable
                                            color={usedAndUseful === false ? 'error' : 'default'}
                                            onClick={() => setUsedAndUseful(false)}
                                            sx={{ fontWeight: 700, borderRadius: 999 }}
                                        />
                                    </Stack>
                                </Box>

                                {deleteError && <Alert severity="error">{deleteError}</Alert>}

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        startIcon={<DeleteOutlineRoundedIcon />}
                                        disabled={deleting || usedAndUseful === null}
                                        onClick={handleDelete}
                                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                                    >
                                        {deleting ? 'Deleting...' : 'Delete subscription'}
                                    </Button>

                                    <Button
                                        component={RouterLink}
                                        to="/my-subs"
                                        variant="outlined"
                                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                                    >
                                        Keep it
                                    </Button>
                                </Stack>
                            </Stack>
                        </AppSurfaceCard>
                    ) : (
                        <AppSurfaceCard
                            sx={{
                                p: { xs: 3, md: 4 },
                                border: `1px solid ${theme.palette.success.light}`,
                            }}
                        >
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                        Re-enable subscription
                                    </Typography>
                                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                        This subscription is currently inactive. If you started paying for it again, record when it came back and at what price.
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                                        Did you re-enable this subscription?
                                    </Typography>

                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        <Chip
                                            label="Yes"
                                            clickable
                                            color={wasReenabled === true ? 'success' : 'default'}
                                            onClick={() => setWasReenabled(true)}
                                            sx={{ fontWeight: 700, borderRadius: 999 }}
                                        />
                                        <Chip
                                            label="No"
                                            clickable
                                            color={wasReenabled === false ? 'default' : 'default'}
                                            onClick={() => setWasReenabled(false)}
                                            sx={{ fontWeight: 700, borderRadius: 999 }}
                                        />
                                    </Stack>
                                </Box>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                        label="Re-enabled from"
                                        type="date"
                                        fullWidth
                                        value={reenabledFromDate}
                                        onChange={(e) => setReenabledFromDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        disabled={wasReenabled !== true}
                                    />

                                    <TextField
                                        label={`Price (${subscription.currency})`}
                                        type="number"
                                        fullWidth
                                        value={reenabledPrice}
                                        onChange={(e) => setReenabledPrice(e.target.value)}
                                        inputProps={{ min: 0, step: '0.01' }}
                                        disabled={wasReenabled !== true}
                                    />
                                </Stack>

                                {updateError && <Alert severity="error">{updateError}</Alert>}

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<RestartAltRoundedIcon />}
                                        disabled={updating || wasReenabled !== true}
                                        onClick={handleReenable}
                                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                                    >
                                        {updating ? 'Saving...' : 'Re-enable subscription'}
                                    </Button>

                                    <Button
                                        component={RouterLink}
                                        to="/my-subs"
                                        variant="outlined"
                                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                                    >
                                        Back to list
                                    </Button>
                                </Stack>
                            </Stack>
                        </AppSurfaceCard>
                    )}
                </Stack>
            )}
        </AppShell>
    );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <Box>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
);

export default SubscriptionDetailPage;
