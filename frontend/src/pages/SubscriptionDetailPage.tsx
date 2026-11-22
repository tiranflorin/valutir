import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Stack } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import ServiceIcon from '../components/ServiceIcon';
import SubscriptionDeleteCard from '../components/subscription-detail/SubscriptionDeleteCard';
import SubscriptionCancelCard from '../components/subscription-detail/SubscriptionCancelCard';
import SubscriptionEditCard from '../components/subscription-detail/SubscriptionEditCard';
import SubscriptionHeaderCard from '../components/subscription-detail/SubscriptionHeaderCard';
import type { SubscriptionCardModel, SubscriptionRecord } from '../types/subscription';
import SubscriptionInfoCard from '../components/subscription-detail/SubscriptionInfoCard';
import SubscriptionPriceHistoryCard from '../components/subscription-detail/SubscriptionPriceHistoryCard';
import SubscriptionReenableCard from '../components/subscription-detail/SubscriptionReenableCard';
import SubscriptionReviewFlagCard from '../components/subscription-detail/SubscriptionReviewFlagCard';
import { useAuth } from '../context/AuthContext';
import { useAccountErrorHandler } from '../hooks/useAccountErrorHandler';
import { fetchSubscription, toCardModel } from '../services/subscriptions';

const SubscriptionDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { subscriptionId } = useParams();
    const { token } = useAuth();
    const errorMessage = useAccountErrorHandler();

    const [subscription, setSubscription] = useState<SubscriptionCardModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCancelMode, setIsCancelMode] = useState(false);

    // Nothing to load without a token or an id: say why instead.
    const missing = !token ? 'You are not authenticated.' : !subscriptionId || subscriptionId === 'new' ? 'Missing subscription id.' : null;

    useEffect(() => {
        if (!token || !subscriptionId || missing) return undefined;
        let cancelled = false;
        fetchSubscription(token, subscriptionId).then(
            (record) => {
                if (!cancelled) setSubscription(toCardModel(record));
            },
            (err: unknown) => {
                const message = errorMessage(err);
                if (!cancelled && message !== null) setError(message);
            },
        ).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [token, subscriptionId, missing, errorMessage]);

    const handleSaved = (updatedSubscription: SubscriptionRecord) => {
        setSubscription(toCardModel(updatedSubscription));
        setIsEditMode(false);
        setIsCancelMode(false);
    };

    const handleCancelled = (updatedSubscription: SubscriptionRecord) => {
        setSubscription(toCardModel(updatedSubscription));
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

            {loading && !missing && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            )}

            {(missing || (!loading && error)) && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {missing ?? error}
                </Alert>
            )}

            {!loading && subscription && (
                <Stack className="subscription-detail-content" spacing={2}>
                    {isEditMode ? (
                        <Box className="subscription-editor-heading">
                            {/*<span className="section-kicker">SUBSCRIPTION DETAILS</span>*/}
                            <div className="service-heading">
                                <ServiceIcon serviceName={subscription.serviceName} size="lg" />
                                <h1>Edit subscription</h1>
                            </div>
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
                            onSaved={handleSaved}
                            onCancel={() => setIsEditMode(false)}
                        />
                    )}

                    {!isEditMode && <SubscriptionInfoCard subscription={subscription} />}

                    {!isEditMode && (
                        <SubscriptionPriceHistoryCard
                            subscription={subscription}
                            onUpdated={(record) => setSubscription(toCardModel(record))}
                        />
                    )}

                    {!isEditMode && !isCancelMode && subscription.status !== 'cancelled' && (
                        <SubscriptionReviewFlagCard
                            subscription={subscription}
                            onUpdated={handleSaved}
                        />
                    )}

                    {!isEditMode && subscription.status !== 'cancelled' && isCancelMode && (
                        <SubscriptionCancelCard
                            subscription={subscription}
                            onCancelled={handleCancelled}
                            onKeepTracking={() => setIsCancelMode(false)}
                        />
                    )}

                    {!isEditMode && subscription.status === 'cancelled' && (
                        <>
                            <SubscriptionReenableCard
                                subscription={subscription}
                                onReenabled={handleSaved}
                            />
                            <SubscriptionDeleteCard
                                subscriptionId={subscription.id}
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
