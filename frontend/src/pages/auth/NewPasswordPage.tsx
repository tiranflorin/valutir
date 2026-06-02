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
    Alert,
    CircularProgress,
    LinearProgress,
    useTheme,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import ValuTirLogo from '../../components/ValuTirLogo';

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

const getPasswordStrength = (pwd: string): PasswordStrength => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels: PasswordStrength[] = [
        { score: 0, label: '', color: '#e0e0e0' },
        { score: 1, label: 'Weak', color: '#f44336' },
        { score: 2, label: 'Fair', color: '#FF9800' },
        { score: 3, label: 'Good', color: '#2196F3' },
        { score: 4, label: 'Strong', color: '#2ECC71' },
    ];
    return levels[score];
};

const PasswordRule: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
        {met ? (
            <CheckCircleIcon sx={{ fontSize: 14, color: '#2ECC71' }} />
        ) : (
            <CancelIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        )}
        <Typography variant="caption" color={met ? 'text.primary' : 'text.disabled'}>
            {text}
        </Typography>
    </Box>
);

const NewPasswordPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token'); // Reset token from email link

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    const passwordStrength = getPasswordStrength(password);

    const rules = [
        { met: password.length >= 8, text: 'At least 8 characters' },
        { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
        { met: /[0-9]/.test(password), text: 'One number' },
        { met: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
    ];

    const validate = () => {
        let valid = true;
        setPasswordError(''); setConfirmError('');

        if (!token) {
            setError('Invalid or missing reset token. Please request a new reset link.');
            valid = false;
        }
        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        } else if (passwordStrength.score < 3) {
            setPasswordError('Please choose a stronger password');
            valid = false;
        }
        if (!confirmPassword) {
            setConfirmError('Please confirm your password');
            valid = false;
        } else if (password !== confirmPassword) {
            setConfirmError('Passwords do not match');
            valid = false;
        }
        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError('');

        // TODO: integrate with Symfony — POST /api/reset-password/new
        // Body: { token, newPassword }
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
                    <Typography variant="h5" gutterBottom>Password reset successful!</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Your password has been updated. You can now sign in with your new password.
                    </Typography>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={() => navigate('/login')}
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        }}
                    >
                        Go to Sign In
                    </Button>
                </Paper>
            </AuthLayout>
        );
    }

    // Check if token is missing
    if (!token) {
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
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>Invalid link</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        This password reset link is invalid or has expired. Please request a new one.
                    </Typography>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={() => navigate('/request-password-reset')}
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        }}
                    >
                        Request New Reset Link
                    </Button>
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
                    maxWidth: 480,
                    p: { xs: 3, sm: 4 },
                    border: theme.palette.mode === 'dark'
                        ? `1px solid ${theme.palette.divider}`
                        : 'none',
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <ValuTirLogo />
                    <Typography variant="h5" sx={{ mt: 1 }}>
                        Set new password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Your new password must be different from previous ones
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        label="New password"
                        type={showPassword ? 'text' : 'password'}
                        fullWidth
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        error={!!passwordError}
                        helperText={passwordError}
                        sx={{ mb: password ? 1 : 2 }}
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
                                        size="small"
                                        aria-label="toggle password visibility"
                                    >
                                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {password && (
                        <Box sx={{ mb: 2, px: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={(passwordStrength.score / 4) * 100}
                                    sx={{
                                        flex: 1,
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: 'action.hover',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: passwordStrength.color,
                                            borderRadius: 3,
                                        },
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: passwordStrength.color, minWidth: 42, fontWeight: 600 }}>
                                    {passwordStrength.label}
                                </Typography>
                            </Box>
                            {rules.map(r => (
                                <PasswordRule key={r.text} met={r.met} text={r.text} />
                            ))}
                        </Box>
                    )}

                    <TextField
                        label="Confirm new password"
                        type={showConfirm ? 'text' : 'password'}
                        fullWidth
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        error={!!confirmError}
                        helperText={confirmError}
                        sx={{ mb: 3 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockOutlinedIcon color={confirmError ? 'error' : 'action'} fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowConfirm(p => !p)}
                                        edge="end"
                                        size="small"
                                        aria-label="toggle confirm password visibility"
                                    >
                                        {showConfirm ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </IconButton>
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
                            background: `linear-gradient(135deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`,
                            },
                            mb: 2,
                        }}
                    >
                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Set New Password'}
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

export default NewPasswordPage;
