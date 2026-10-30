import React, { useState } from 'react';
import { Alert, Box, Button, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import './PlansPage.css';

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
    const { isAuthenticated } = useAuth();
    const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);

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
                        <div className="plan-price">Pay once <span>amount to be decided</span></div>
                        <div className="plan-rule" />
                        <ul className="plan-features">
                            {unlockFeatures.map((feature) => <li key={feature}>{feature}</li>)}
                        </ul>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => setShowUpgradeNotice(true)}
                        >
                            One-time upgrade
                        </Button>
                    </Paper>
                </Box>

                <Box className="plans-business-note">
                    <strong>Business tracking itself stays free.</strong> Marking a subscription Business and switching
                    dashboards never requires payment. The one-time unlock is for going beyond 50 active subscriptions
                    or using advanced business tools.
                </Box>
                {showUpgradeNotice && (
                    <Alert className="plans-upgrade-notice" severity="info" role="status">
                        The one-time upgrade will be available here once plans and checkout are ready.
                    </Alert>
                )}
                <p className="plans-footnote">
                    At 50 active subscriptions, your current records remain available to view, edit, review and archive.
                    Add a 51st after the one-time unlock.<br />
                    The payment amount and exact included business tools are still to be set.
                </p>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default PlansPage;
