import React from 'react';
import { Box, Button, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';

/** Shown for any address the app doesn't know, and for pages the visitor may not open (it never says which). */
const NotFoundPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Box className="dashboard-page settings-page">
            <AppHeader />
            <Container component="main" className="settings-container">
                <Box className="settings-page-heading">
                    <h1>Page not found</h1>
                    <p>There&apos;s no page at this address. The link may be mistyped, or the page may have moved.</p>
                </Box>
                <Paper className="settings-card">
                    <Button component={RouterLink} to={isAuthenticated ? '/my-subs' : '/'} variant="contained">
                        {isAuthenticated ? 'Go to your subscriptions' : 'Go to the homepage'}
                    </Button>
                </Paper>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default NotFoundPage;
