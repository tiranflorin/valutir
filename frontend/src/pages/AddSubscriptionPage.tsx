import React, { useMemo, useState } from 'react';
import { Box, Button, Container } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import SubscriptionFormCard, {
    type BillingInterval,
    type SubscriptionFormValues,
    type SubscriptionStatus,
} from '../components/subscription-form/SubscriptionFormCard';
import { useAuth } from '../context/AuthContext';
import { getDefaultCurrency } from '../services/preferences';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const AddSubscriptionPage: React.FC = () => {
    const navigate = useNavigate();
    const { token, logout, user } = useAuth();

    const [values, setValues] = useState<SubscriptionFormValues>({
        serviceName: '',
        amount: '15.99',
        currency: getDefaultCurrency(user?.email),
        billingInterval: 'monthly' as BillingInterval,
        renewalDate: '',
        category: 'Entertainment',
        status: 'Active' as SubscriptionStatus,
        notes: '',
        providerGroup: '',
        householdShared: false,
        autoRenew: true,
        b2b: window.localStorage.getItem('valutir_dashboard_view') === 'business',
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isTrial = values.status === 'Trial';
    const isOther = values.status === 'Other';

    const statusPayload = useMemo(() => {
        if (values.status === 'Trial') return 'trial';
        if (values.status === 'Other') return 'other';
        return 'active';
    }, [values.status]);

    const billingDateLabel = isTrial ? 'First charge date' : 'Next billing date';

    const handleSubmit = async () => {
        if (!token) {
            setError('You are not authenticated.');
            return;
        }

        if (!values.serviceName.trim()) {
            setError('Service name is required.');
            return;
        }

        if (!values.amount || Number(values.amount) <= 0) {
            setError('Price must be greater than 0.');
            return;
        }

        if (!values.renewalDate) {
            setError(`${billingDateLabel} is required.`);
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const today = new Date().toISOString().slice(0, 10);

            const payload = {
                serviceName: values.serviceName.trim(),
                amount: Number(values.amount),
                currency: values.currency,
                billingCadence: values.billingInterval,
                category: values.category,
                status: statusPayload,
                startedAt: today,
                nextBillingDate: values.renewalDate,
                trialEndsAt: isTrial ? values.renewalDate : null,
                trialReminderSentAt: null,
                notes: values.notes.trim() || null,
                paymentMethod: values.providerGroup.trim() || null,
                householdShared: values.householdShared,
                autoRenew: !isOther && values.autoRenew,
                b2b: values.b2b,
                cancelledAt: isOther ? today : null,
            };

            const response = await fetch(`${API_BASE}/api/subs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                logout();
                navigate('/login', { replace: true });
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to create subscription.');
            }

            navigate('/my-subs');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
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

                <Box className="subscription-editor-heading">
                    {/*<span className="section-kicker">SUBSCRIPTION DETAILS</span>*/}
                    <h1>Add a subscription</h1>
                    <p>Fill in the essentials first. You can include extra context when it helps.</p>
                </Box>

                <SubscriptionFormCard
                    title="Add subscription"
                    description="Add the essentials first. Optional details stay hidden until you need them."
                    showHeader={false}
                    values={values}
                    onChange={setValues}
                    error={error}
                    submitting={submitting}
                    submitLabel="Save subscription"
                    onSubmit={() => {
                        void handleSubmit();
                    }}
                    onCancel={() => navigate('/my-subs')}
                    showCurrency
                    showProviderGroup
                    showHouseholdShared
                />
            </Container>
            <AppFooter />
        </Box>
    );
};

export default AddSubscriptionPage;
