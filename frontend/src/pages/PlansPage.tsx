import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { type BillingStatus, fetchBillingStatus, formatPrice, startCheckout } from '../services/account';
import { LEGAL } from '../legal';
import './PlansPage.css';

/** Shown before the account's status loads (and to visitors); the server's figure wins once loaded. */
const DEFAULT_PRICE: BillingStatus['price'] = { amountInCents: 1999, currency: 'EUR', taxInclusive: true };
/** After returning from Stripe, the webhook usually lands within seconds. */
const UNLOCK_POLL_INTERVAL_MS = 2000;
const UNLOCK_POLL_ATTEMPTS = 15;

type ReturnState = 'confirming' | 'confirmed' | 'delayed' | 'cancelled' | null;

const freeFeatures = [
    'Personal and Business dashboards',
    'Up to 50 active subscriptions combined',
    'Renewal calendar and basic reminders',
    'Monthly and yearly cost summaries',
    'Trial tracking and review decisions',
    'One account; each subscription belongs to one view',
];

const unlockFeatures = [
    'Add and track more than 50 active subscriptions',
    'Project and cost-center allocation for Business',
    'Bookkeeping-ready business export',
    'Custom reminder timing and renewal reports',
    'Price and renewal history',
    'Keep both dashboards and the same shared account',
];

const PlansPage: React.FC = () => {
    const { isAuthenticated, token, user } = useAuth();
    // The server refuses checkout too; this just explains why before the click.
    const emailUnverified = user?.emailVerified === false;
    const [searchParams, setSearchParams] = useSearchParams();
    const [loadedStatus, setStatus] = useState<BillingStatus | null>(null);
    // A status loaded for an earlier session is never shown after sign-out.
    const status = token ? loadedStatus : null;
    const [error, setError] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [returnState, setReturnState] = useState<ReturnState>(() => {
        const checkout = searchParams.get('checkout');
        if (checkout === 'success') {
            return 'confirming';
        }
        return checkout === 'cancelled' ? 'cancelled' : null;
    });

    // Drop ?checkout=… so a reload doesn't repeat the message.
    useEffect(() => {
        if (searchParams.has('checkout')) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (!token) {
            return undefined;
        }
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        // Only the server's webhook unlocks an account, so after Stripe redirects back we wait for it.
        const load = async (attempt: number) => {
            try {
                const next = await fetchBillingStatus(token);
                if (cancelled) {
                    return;
                }
                setStatus(next);
                if (returnState !== 'confirming') {
                    return;
                }
                if (next.unlocked) {
                    setReturnState('confirmed');
                } else if (attempt + 1 < UNLOCK_POLL_ATTEMPTS) {
                    timer = setTimeout(() => void load(attempt + 1), UNLOCK_POLL_INTERVAL_MS);
                } else {
                    setReturnState('delayed');
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unable to load your plan.');
                }
            }
        };
        void load(0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [token, returnState]);

    const handleUpgrade = async () => {
        if (!token) {
            return;
        }
        setError('');
        setRedirecting(true);
        try {
            window.location.assign(await startCheckout(token));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to start the payment. Please try again later.');
            setRedirecting(false);
        }
    };

    const price = formatPrice(status?.price ?? DEFAULT_PRICE);
    const upgradeButton = (() => {
        if (!isAuthenticated) {
            return (
                <Button component={RouterLink} to="/register" variant="contained" fullWidth>
                    Create a free account to upgrade
                </Button>
            );
        }
        if (status?.unlocked) {
            return <Button variant="contained" fullWidth disabled>Unlocked on this account</Button>;
        }

        return (
            <Button
                variant="contained"
                fullWidth
                onClick={() => void handleUpgrade()}
                disabled={!status || !status.checkoutAvailable || emailUnverified || redirecting || returnState === 'confirming'}
            >
                {redirecting ? 'Opening secure checkout…' : `Pay ${price} once`}
            </Button>
        );
    })();

    return (
        <Box className="dashboard-page plans-page">
            <AppHeader />
            <Container className="plans-container">
                <Box className="plans-hero">
                    <h1>A useful tracker should stay useful for free.</h1>
                    <p>
                        Personal and Business views stay free. Pay once only if you need more than 50 active
                        subscriptions or the advanced small-business tools.
                    </p>
                </Box>

                <Box className="plans-grid">
                    <Paper className="plan-card" elevation={0}>
                        <div className="plan-label">Free forever</div>
                        <h2>Core tracking</h2>
                        <p className="plan-description">For personal bills and the everyday business list.</p>
                        <div className="plan-price">€0 <span>forever</span></div>
                        <div className="plan-rule" />
                        <ul className="plan-features">
                            {freeFeatures.map((feature) => <li key={feature}>{feature}</li>)}
                        </ul>
                        <Button
                            component={RouterLink}
                            to={isAuthenticated ? '/my-subs' : '/register'}
                            variant="outlined"
                            fullWidth
                        >
                            {isAuthenticated ? 'Go to subscriptions' : 'Start for free'}
                        </Button>
                    </Paper>

                    <Paper className="plan-card plan-card--featured" elevation={0}>
                        <div className="plan-label">One-time unlock · no renewal</div>
                        <h2>More room for your list</h2>
                        <p className="plan-description">For people who track more services or need extra business detail.</p>
                        <div className="plan-price">{price} <span>once · VAT included</span></div>
                        <div className="plan-rule" />
                        <ul className="plan-features">
                            {unlockFeatures.map((feature) => <li key={feature}>{feature}</li>)}
                        </ul>
                        {upgradeButton}
                        <p className="plan-secure-note">
                            Secure payment by Stripe. ValuTir never sees your card details.<br />
                            {LEGAL.refundDays}-day money-back guarantee. By paying you agree to the{' '}
                            <RouterLink to="/terms">Terms</RouterLink> and <RouterLink to="/refunds">Refund policy</RouterLink>.
                        </p>
                    </Paper>
                </Box>

                <Box className="plans-business-note">
                    <strong>Business tracking itself stays free.</strong> Marking a subscription Business and switching
                    dashboards never requires payment. The one-time unlock is for going beyond 50 active subscriptions
                    or using advanced business tools.
                </Box>
                {status && !status.unlocked && (
                    <p className="plans-usage" role="status">
                        You have {status.activeCount} of {status.freeActiveLimit} active subscriptions on the free plan.
                    </p>
                )}
                {status && !status.unlocked && emailUnverified && (
                    <Alert className="plans-upgrade-notice" severity="info">
                        Confirm your email address first: Stripe sends your receipt there. Use the link we emailed you, or “Resend link” at the top of the page.
                    </Alert>
                )}
                {status && !status.checkoutAvailable && !status.unlocked && (
                    <Alert className="plans-upgrade-notice" severity="info">Payments are not available right now. Please try again later.</Alert>
                )}
                {returnState === 'confirming' && (
                    <Alert className="plans-upgrade-notice" severity="info" role="status">Payment received. Unlocking your account…</Alert>
                )}
                {returnState === 'confirmed' && (
                    <Alert className="plans-upgrade-notice" severity="success" role="status">Your account is unlocked. Thank you!</Alert>
                )}
                {returnState === 'delayed' && (
                    <Alert className="plans-upgrade-notice" severity="warning" role="status">
                        Your payment is still being confirmed. Some payment methods take a few days; this page updates once it clears.
                        If you were charged and nothing changes, <RouterLink to="/contact">contact us</RouterLink>.
                    </Alert>
                )}
                {returnState === 'cancelled' && (
                    <Alert className="plans-upgrade-notice" severity="info" role="status">Payment cancelled. You were not charged.</Alert>
                )}
                {error && <Alert className="plans-upgrade-notice" severity="error">{error}</Alert>}
                <p className="plans-footnote">
                    At 50 active subscriptions, your current records remain available to view, edit, review and archive.
                    Add a 51st after the one-time unlock. Some advanced business tools are still being built; they
                    aren&apos;t part of the purchase until they&apos;re released (see the <RouterLink to="/terms">Terms</RouterLink>).
                </p>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default PlansPage;
