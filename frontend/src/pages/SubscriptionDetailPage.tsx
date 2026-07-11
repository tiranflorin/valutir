import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import AppSurfaceCard from '../components/AppSurfaceCard';
import { mockSubscriptions } from '../mock/subscriptions';

const SubscriptionDetailPage: React.FC = () => {
    const { subscriptionId } = useParams();
    const subscription = mockSubscriptions.find((item) => item.id === subscriptionId);

    return (
        <AppShell centered={false} maxWidth="lg" showThemeToggle={false}>
            <AppHeader />

            <Stack spacing={3} sx={{ mt: { xs: 4, md: 6 } }}>
                <Box>
                    <Button
                        component={RouterLink}
                        to="/my-subs"
                        startIcon={<ArrowBackRoundedIcon />}
                        sx={{ borderRadius: 999, fontWeight: 700 }}
                    >
                        Back to My Subs
                    </Button>
                </Box>

                <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                        {subscription?.name || 'Subscription'}
                    </Typography>
                    <Typography color="text.secondary">
                        Detail page placeholder for the selected subscription.
                    </Typography>
                </AppSurfaceCard>
            </Stack>
        </AppShell>
    );
};

export default SubscriptionDetailPage;
