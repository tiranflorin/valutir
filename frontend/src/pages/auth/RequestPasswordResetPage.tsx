import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Link,
    InputAdornment,
    Alert,
    CircularProgress,
    useTheme,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import BrandLogo from '../../components/BrandLogo';
import { requestPasswordReset } from '../../services/auth';

const RequestPasswordResetPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [emailError, setEmailError] = useState('');

    const validate = () => {
        let valid = true;
        setEmailError('');
        setError('');

        if (!email) {
            setEmailError('Email is required');
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Enter a valid email address');
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
            await requestPasswordReset(email);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not request password reset');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AppShell mode="auth" maxWidth="sm" showThemeToggle>
                <Paper
                    elevation={theme.palette.mode === 'dark' ? 0 : 4}
                    sx={{
                        width: '100%',
                        maxWidth: 440,
                        p: 4,
                        textAlign: 'center',
                        border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none',
                        borderRadius: 4,
                    }}
                >
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        Check your email
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        If the email is registered, a password reset link has been sent to <strong>{email}</strong>.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Check your inbox and spam folder, then follow the reset instructions.
                    </Typography>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={() => {
                            setSuccess(false);
                            setEmail('');
                        }}
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
                            mb: 2,
                            borderRadius: 999,
                            py: 1.4,
                            fontWeight: 700,
                        }}
                    >
                        Try Another Email
                    </Button>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Remember your password?{' '}
                            <Link
                                component="button"
                                variant="body2"
                                color="primary"
                                fontWeight={600}
                                underline="hover"
                                onClick={() => navigate('/login')}
                            >
                                Sign in
                            </Link>
                        </Typography>
                    </Box>
                </Paper>
            </AppShell>
        );
    }

    return (
        <AppShell mode="auth" maxWidth="sm" showThemeToggle>
            <Paper
                elevation={theme.palette.mode === 'dark' ? 0 : 4}
                sx={{
                    width: '100%',
                    maxWidth: 440,
                    p: { xs: 3, sm: 4 },
                    border: theme.palette.mode === 'dark'
                        ? `1px solid ${theme.palette.divider}`
                        : 'none',
                    borderRadius: 4,
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <BrandLogo
                        size="auth"
                        sx={{
                            mb: 1.5,
                            display: 'block',
                            textAlign: 'center',
                        }}
                    />
                    <Typography variant="h5" sx={{ mt: 1 }}>
                        Forgot password?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        We&apos;ll send you reset instructions
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        label="Email address"
                        type="email"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!emailError}
                        helperText={emailError}
                        sx={{ mb: 3 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailOutlinedIcon color={emailError ? 'error' : 'action'} fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={loading}
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                            },
                            mb: 2,
                            borderRadius: 999,
                            py: 1.4,
                            fontWeight: 700,
                        }}
                    >
                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset Password'}
                    </Button>

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Remember your password?{' '}
                            <Link
                                component="button"
                                variant="body2"
                                color="primary"
                                fontWeight={600}
                                underline="hover"
                                onClick={() => navigate('/login')}
                            >
                                Sign in
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </AppShell>
    );
};

export default RequestPasswordResetPage;
