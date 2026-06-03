import React from 'react';
import {
    Box,
    Button,
    CardContent,
    Chip,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined';
import AppSurfaceCard from '../components/AppSurfaceCard';
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';


const HomePage: React.FC = () => {
    const theme = useTheme();
    const { isAuthenticated, user } = useAuth();

    return (
        <AppShell centered={false} maxWidth="lg">
            <Box sx={{ minHeight: '100%' }}>
                <AppHeader />

                <Stack spacing={4} sx={{ mt: { xs: 4, md: 6 } }}>
                    <AppSurfaceCard sx={{ p: { xs: 3, md: 5 } }}>
                        <Chip
                            icon={<AutoAwesomeOutlinedIcon />}
                            label="Subscription tracking made simple"
                            sx={{
                                mb: 2,
                                borderRadius: 999,
                                bgcolor:
                                    theme.palette.mode === 'dark'
                                        ? 'rgba(21, 101, 192, 0.18)'
                                        : 'rgba(21, 101, 192, 0.10)',
                                color: 'primary.main',
                                fontWeight: 700,
                            }}
                        />

                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                mb: 1.5,
                                maxWidth: 760,
                                lineHeight: 1.1,
                            }}
                        >
                            Manage recurring subscriptions with a cleaner, calmer workspace
                        </Typography>

                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ maxWidth: 760, mb: 3 }}
                        >
                            ValuTir is shaping into your central place for account access, subscription visibility,
                            and upcoming management tools for active plans.
                        </Typography>

                        {isAuthenticated ? (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Button
                                    component={RouterLink}
                                    to="/my-subs"
                                    variant="contained"
                                    size="large"
                                    startIcon={<SubscriptionsOutlinedIcon />}
                                    sx={{
                                        borderRadius: 999,
                                        px: 3,
                                        py: 1.4,
                                        fontWeight: 700,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    }}
                                >
                                    Go to My Subs
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="large"
                                    sx={{
                                        borderRadius: 999,
                                        px: 3,
                                        py: 1.4,
                                        fontWeight: 700,
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                    }}
                                >
                                    {user?.email || 'Logged in'}
                                </Button>
                            </Stack>
                        ) : (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Button
                                    component={RouterLink}
                                    to="/register"
                                    variant="contained"
                                    size="large"
                                    sx={{
                                        borderRadius: 999,
                                        px: 3,
                                        py: 1.4,
                                        fontWeight: 700,
                                        background: `linear-gradient(135deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
                                    }}
                                >
                                    Create Account
                                </Button>

                                <Button
                                    component={RouterLink}
                                    to="/login"
                                    variant="outlined"
                                    size="large"
                                    startIcon={<LockOpenOutlinedIcon />}
                                    sx={{
                                        borderRadius: 999,
                                        px: 3,
                                        py: 1.4,
                                        fontWeight: 700,
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                    }}
                                >
                                    Login
                                </Button>
                            </Stack>
                        )}
                    </AppSurfaceCard>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                        <AppSurfaceCard compact>
                            <CardContent sx={{ p: 3.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                    Secure access
                                </Typography>
                                <Typography color="text.secondary">
                                    Account registration, login, and password reset are now connected to the backend.
                                </Typography>
                            </CardContent>
                        </AppSurfaceCard>

                        <AppSurfaceCard compact>
                            <CardContent sx={{ p: 3.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                    My Subs next
                                </Typography>
                                <Typography color="text.secondary">
                                    The authenticated area is ready for future subscription management features.
                                </Typography>
                            </CardContent>
                        </AppSurfaceCard>
                    </Stack>
                </Stack>
            </Box>
        </AppShell>
    );
};

export default HomePage;
