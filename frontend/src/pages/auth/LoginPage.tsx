import React, { useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    TextField,
    Typography,
    Alert,
    useTheme,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import ValuTirLogo from '../../components/ValuTirLogo';
import { useAuth } from '../../context/AuthContext';

const LoginPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const validate = () => {
        let valid = true;

        setEmailError('');
        setPasswordError('');
        setError('');

        if (!email) {
            setEmailError('Email is required');
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Enter a valid email address');
            valid = false;
        }

        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        }

        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        try {
            setLoading(true);
            setError('');
            await login(email, password);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell>
            <Paper
                elevation={theme.palette.mode === 'dark' ? 0 : 6}
                sx={{
                    width: '100%',
                    maxWidth: 460,
                    p: { xs: 3, sm: 4 },
                    borderRadius: 4,
                    border: theme.palette.mode === 'dark'
                        ? `1px solid ${theme.palette.divider}`
                        : 'none',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <ValuTirLogo />
                    <Typography variant="h5" sx={{ mt: 1.5, fontWeight: 700 }}>
                        Welcome back
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Sign in to manage your account
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        label="Email address"
                        type="email"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!emailError}
                        helperText={emailError}
                        autoComplete="email"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailOutlinedIcon color={emailError ? 'error' : 'action'} fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={!!passwordError}
                        helperText={passwordError}
                        autoComplete="current-password"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockOutlinedIcon color={passwordError ? 'error' : 'action'} fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        edge="end"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 2 }}>
                        <Link
                            component="button"
                            type="button"
                            variant="body2"
                            underline="hover"
                            onClick={() => navigate('/request-password-reset')}
                        >
                            Forgot password?
                        </Link>
                    </Box>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{
                            py: 1.4,
                            borderRadius: 999,
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                            },
                        }}
                    >
                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                    </Button>

                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>
                        Don&apos;t have an account?{' '}
                        <Link
                            component="button"
                            type="button"
                            underline="hover"
                            fontWeight={600}
                            onClick={() => navigate('/register')}
                        >
                            Create account
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </AppShell>
    );
};

export default LoginPage;
