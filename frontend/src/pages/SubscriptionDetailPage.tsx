import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import SubscriptionDeleteCard from '../components/subscription-detail/SubscriptionDeleteCard';
import SubscriptionEditCard from '../components/subscription-detail/SubscriptionEditCard';
import SubscriptionHeaderCard, { SubscriptionCardModel } from '../components/subscription-detail/SubscriptionHeaderCard';
import SubscriptionInfoCard from '../components/subscription-detail/SubscriptionInfoCard';
import SubscriptionReenableCard from '../components/subscription-detail/SubscriptionReenableCard';
import { useAuth } from '../context/AuthContext';
import { VITE_API_URL } from '../services/auth';

const SubscriptionDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { subscriptionId } = useParams();
    const { token, logout } = useAuth();

    const [subscription, setSubscription] = useState<SubscriptionCardModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);

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
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong.');
            } finally {
                setLoading(false);
            }
        };

        loadSubscription();
    }, [token, subscriptionId, logout, navigate]);

    const handleUnauthorized = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const handleSaved = (updatedSubscription: SubscriptionCardModel) => {
        setSubscription(updatedSubscription);
        setIsEditMode(false);
    };

    const handleDeleted = () => {
        navigate('/my-subs', {
            replace: true,
            state: {
                deletedSubscriptionMessage: 'Subscription deleted successfully.',
            },
        });
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
                    <SubscriptionHeaderCard
                        subscription={subscription}
                        isEditMode={isEditMode}
                        onStartEdit={() => setIsEditMode(true)}
                        onCancelEdit={() => setIsEditMode(false)}
                    />

                    {subscription.status !== 'cancelled' ? (
                        isEditMode ? (
                            <SubscriptionEditCard
                                subscription={subscription}
                                token={token ?? ''}
                                onUnauthorized={handleUnauthorized}
                                onSaved={handleSaved}
                                onCancel={() => setIsEditMode(false)}
                            />
                        ) : (
                            <SubscriptionInfoCard subscription={subscription} />
                        )
                    ) : (
                        <>
                            <SubscriptionInfoCard subscription={subscription} />
                            <SubscriptionReenableCard
                                subscription={subscription}
                                token={token ?? ''}
                                onUnauthorized={handleUnauthorized}
                                onReenabled={handleSaved}
                            />
                        </>
                    )}

                    {subscription.status !== 'cancelled' && !isEditMode && (
                        <SubscriptionDeleteCard
                            subscriptionId={subscription.id}
                            token={token ?? ''}
                            onUnauthorized={handleUnauthorized}
                            onDeleted={handleDeleted}
                        />
                    )}
                </Stack>
            )}
        </AppShell>
    );
};

export default SubscriptionDetailPage;
