import React from 'react';
import { Box, CardContent, Typography, useTheme } from '@mui/material';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import AppSurfaceCard from '../components/AppSurfaceCard';

const MySubscriptionsPage: React.FC = () => {
    const theme = useTheme();

    return (
        <AppShell centered={false} maxWidth="lg">
            <Box sx={{ minHeight: '100%' }}>
                <AppHeader />

                <AppSurfaceCard sx={{ mt: { xs: 4, md: 6 } }}>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                            My Subs
                        </Typography>
                        <Typography color="text.secondary">
                            This area is reserved for managing the user&apos;s current subscriptions in a future step.
                        </Typography>
                    </CardContent>
                </AppSurfaceCard>
            </Box>
        </AppShell>
    );
};

export default MySubscriptionsPage;
