import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Stack } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import SubscriptionDeleteCard from '../components/subscription-detail/SubscriptionDeleteCard';
import SubscriptionCancelCard from '../components/subscription-detail/SubscriptionCancelCard';
import SubscriptionEditCard from '../components/subscription-detail/SubscriptionEditCard';
import SubscriptionHeaderCard, { type SubscriptionCardModel } from '../components/subscription-detail/SubscriptionHeaderCard';
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
    const [isCancelMode, setIsCancelMode] = useState(false);

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
        setIsCancelMode(false);
    };

    const handleCancelled = (updatedSubscription: SubscriptionCardModel) => {
        setSubscription(updatedSubscription);
        setIsCancelMode(false);
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
        <Box className="dashboard-page subscription-editor-page">
            <AppHeader />

            <Container className="dashboard-container subscription-editor-container">
                <Button
                    component={RouterLink}
                    to="/my-subs"
                    variant="text"
                    startIcon={<ArrowBackRoundedIcon />}
                    className="subscription-back-link"
                >
                    Back to subscriptions
                </Button>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!loading && subscription && (
                <Stack className="subscription-detail-content" spacing={2}>
                    {isEditMode ? (
                        <Box className="subscription-editor-heading">
                            <span className="section-kicker">SUBSCRIPTION DETAILS</span>
                            <h1>Edit subscription</h1>
                            <p>Update the details for {subscription.serviceName}. Changes will be saved to your account.</p>
                        </Box>
                    ) : (
                        <SubscriptionHeaderCard
                            subscription={subscription}
                            isEditMode={false}
                            onStartEdit={() => setIsEditMode(true)}
                            onCancelEdit={() => setIsEditMode(false)}
                            onStartCancel={isCancelMode ? undefined : () => setIsCancelMode(true)}
                        />
                    )}

                    {isEditMode && (
                        <SubscriptionEditCard
                            subscription={subscription}
                            token={token ?? ''}
                            onUnauthorized={handleUnauthorized}
                            onSaved={handleSaved}
                            onCancel={() => setIsEditMode(false)}
                        />
                    )}

                    {!isEditMode && <SubscriptionInfoCard subscription={subscription} />}

                    {!isEditMode && subscription.status !== 'cancelled' && isCancelMode && (
                        <SubscriptionCancelCard
                            subscription={subscription}
                            token={token ?? ''}
                            onUnauthorized={handleUnauthorized}
                            onCancelled={handleCancelled}
                            onKeepTracking={() => setIsCancelMode(false)}
                        />
                    )}

                    {!isEditMode && subscription.status === 'cancelled' && (
                        <>
                            <SubscriptionReenableCard
                                subscription={subscription}
                                token={token ?? ''}
                                onUnauthorized={handleUnauthorized}
                                onReenabled={handleSaved}
                            />
                            <SubscriptionDeleteCard
                                subscriptionId={subscription.id}
                                token={token ?? ''}
                                onUnauthorized={handleUnauthorized}
                                onDeleted={handleDeleted}
                            />
                        </>
                    )}
                </Stack>
            )}
            </Container>
            <AppFooter />
        </Box>
    );
};

export default SubscriptionDetailPage;
