import React from 'react';
import {
    Box,
    Button,
    CardActionArea,
    Chip,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import AppSurfaceCard from '../components/AppSurfaceCard';
import { mockSubscriptions } from '../mock/subscriptions';

const MySubscriptionsPage: React.FC = () => {
    const theme = useTheme();

    return (
        <AppShell centered={false} maxWidth="lg" showThemeToggle={false}>
            <AppHeader />

            <Stack spacing={3} sx={{ mt: { xs: 4, md: 6 } }}>
                <AppSurfaceCard sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        justifyContent="space-between"
                    >
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                                My Subs
                            </Typography>
                            <Typography color="text.secondary">
                                Start with a clean overview of your recurring payments and open any subscription in one click.
                            </Typography>
                        </Box>

                        <Button
                            component={RouterLink}
                            to="/my-subs/new"
                            variant="contained"
                            startIcon={<AddOutlinedIcon />}
                            sx={{
                                borderRadius: 999,
                                px: 2.5,
                                fontWeight: 700,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            }}
                        >
                            Add subscription
                        </Button>
                    </Stack>
                </AppSurfaceCard>

                <Stack spacing={2}>
                    {mockSubscriptions.map((subscription) => (
                        <AppSurfaceCard key={subscription.id} compact>
                            <CardActionArea
                                component={RouterLink}
                                to={`/my-subs/${subscription.id}`}
                                sx={{
                                    borderRadius: 3,
                                }}
                            >
                                <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={2}
                                        justifyContent="space-between"
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                    >
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 3,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor:
                                                        theme.palette.mode === 'dark'
                                                            ? 'rgba(46, 204, 113, 0.14)'
                                                            : 'rgba(46, 204, 113, 0.12)',
                                                    color: 'secondary.main',
                                                }}
                                            >
                                                <ConfirmationNumberOutlinedIcon />
                                            </Box>

                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                                    {subscription.name}
                                                </Typography>
                                                <Typography color="text.secondary">
                                                    {subscription.category} · {subscription.billingCycle}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1.5}
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        >
                                            <Chip
                                                label={subscription.status}
                                                color={subscription.status === 'Active' ? 'success' : 'default'}
                                                sx={{ fontWeight: 600 }}
                                            />
                                            <Typography sx={{ fontWeight: 700 }}>
                                                {subscription.amount.toFixed(2)} {subscription.currency}
                                            </Typography>
                                            <ChevronRightRoundedIcon color="action" />
                                        </Stack>
                                    </Stack>
                                </Box>
                            </CardActionArea>
                        </AppSurfaceCard>
                    ))}
                </Stack>
            </Stack>
        </AppShell>
    );
};

export default MySubscriptionsPage;
