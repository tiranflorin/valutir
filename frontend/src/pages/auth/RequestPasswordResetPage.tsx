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
import AuthLayout from '../../components/AuthLayout';
import ValuTirLogo from '../../components/ValuTirLogo';

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
        if (!validate()) return;

        setLoading(true);
        setError('');

        // TODO: integrate with Symfony — POST /api/reset-password/request
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
        }, 1200);
    };

    if (success) {
        return (
            <AuthLayout>
                <Paper
                    elevation={theme.palette.mode === 'dark' ? 0 : 4}
                    sx={{
                        width: '100%',
                        maxWidth: 440,
                        p: 4,
                        textAlign: 'center',
                        border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none',
                    }}
                >
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>Check your email</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        We've sent a password reset link to <strong>{email}</strong>.
                        Check your inbox and follow the instructions.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Didn't receive the email? Check your spam folder or try another email address.
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
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <Paper
                elevation={theme.palette.mode === 'dark' ? 0 : 4}
                sx={{
                    width: '100%',
                    maxWidth: 440,
                    p: { xs: 3, sm: 4 },
                    border: theme.palette.mode === 'dark'
                        ? `1px solid ${theme.palette.divider}`
                        : 'none',
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <ValuTirLogo />
                    <Typography variant="h5" sx={{ mt: 1 }}>
                        Forgot password?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        No worries, we'll send you reset instructions
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
                        onChange={e => setEmail(e.target.value)}
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
        </AuthLayout>
    );
};

export default RequestPasswordResetPage;
