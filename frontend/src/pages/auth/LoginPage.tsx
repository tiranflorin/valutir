import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Link,
    InputAdornment,
    IconButton,
    Divider,
    Alert,
    CircularProgress,
    useTheme,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import ValuTirLogo from '../../components/ValuTirLogo';

const LoginPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validate = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');

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
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            valid = false;
        }

        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError('');

        // TODO: integrate with Symfony Lexik JWT — POST /api/login_check
        setTimeout(() => {
            setLoading(false);
            setError('Backend not connected yet. JWT integration coming soon.');
        }, 1200);
    };

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
                        Welcome back
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Sign in to your ValuTir account
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
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
                        sx={{ mb: 2 }}
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
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        error={!!passwordError}
                        helperText={passwordError}
                        sx={{ mb: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockOutlinedIcon color={passwordError ? 'error' : 'action'} fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword(p => !p)}
                                        edge="end"
                                        aria-label="toggle password visibility"
                                        size="small"
                                    >
                                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                        <Link href="#" variant="body2" color="primary" underline="hover">
                            Forgot password?
                        </Link>
                    </Box>

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
                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                    </Button>

                    <Divider sx={{ my: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            OR
                        </Typography>
                    </Divider>

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Don't have an account?{' '}
                            <Link
                                component="button"
                                variant="body2"
                                color="secondary"
                                fontWeight={600}
                                underline="hover"
                                onClick={() => navigate('/register')}
                            >
                                Create account
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </AuthLayout>
    );
};

export default LoginPage;
