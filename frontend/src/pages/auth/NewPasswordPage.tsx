import React, { useMemo, useState } from 'react';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import ValuTirLogo from '../../components/ValuTirLogo';
import { submitNewPassword } from '../../services/auth';

type StrengthLevel = 'Weak' | 'Fair' | 'Good' | 'Strong';

const NewPasswordPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const checks = useMemo(() => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
        };
    }, [password]);

    const passedChecks = Object.values(checks).filter(Boolean).length;

    const strength = useMemo((): StrengthLevel => {
        if (passedChecks <= 1) return 'Weak';
        if (passedChecks === 2) return 'Fair';
        if (passedChecks === 3) return 'Good';
        return 'Strong';
    }, [passedChecks]);

    const progress = (passedChecks / 4) * 100;

    const validate = () => {
        let valid = true;

        setPasswordError('');
        setConfirmPasswordError('');
        setError('');

        if (!token) {
            setError('Reset token is missing from the URL');
            valid = false;
        }

        if (!password) {
            setPasswordError('New password is required');
            valid = false;
        } else if (strength === 'Weak' || strength === 'Fair') {
            setPasswordError('Password strength must be at least Good');
            valid = false;
        }

        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your new password');
            valid = false;
        } else if (confirmPassword !== password) {
            setConfirmPasswordError('Passwords do not match');
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
            await submitNewPassword(token, password);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AppShell>
                <Paper
                    elevation={theme.palette.mode === 'dark' ? 0 : 4}
                    sx={{
                        width: '100%',
                        maxWidth: 460,
                        p: 4,
                        textAlign: 'center',
                        borderRadius: 4,
                        border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none',
                    }}
                >
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        Password updated
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Your password has been changed successfully. You can now sign in with your new password.
                    </Typography>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={() => navigate('/login')}
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            borderRadius: 999,
                            py: 1.4,
                            fontWeight: 700,
                        }}
                    >
                        Go to login
                    </Button>
                </Paper>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <Paper
                elevation={theme.palette.mode === 'dark' ? 0 : 4}
                sx={{
                    width: '100%',
                    maxWidth: 500,
                    p: { xs: 3, sm: 4 },
                    borderRadius: 4,
                    border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none',
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <ValuTirLogo />
                    <Typography variant="h5" sx={{ mt: 1 }}>
                        Set a new password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: 'center' }}>
                        Choose a strong password for your account
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
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={!!passwordError}
                        helperText={passwordError}
                        autoComplete="new-password"
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
                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Box sx={{ mt: 1.5, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                            <Typography variant="body2" color="text.secondary">
                                Password strength
                            </Typography>
                            <Typography
                                variant="body2"
                                fontWeight={700}
                                color={
                                    strength === 'Weak'
                                        ? 'error.main'
                                        : strength === 'Fair'
                                            ? 'warning.main'
                                            : strength === 'Good'
                                                ? 'info.main'
                                                : 'success.main'
                                }
                            >
                                {strength}
                            </Typography>
                        </Box>

                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            color={
                                strength === 'Weak'
                                    ? 'error'
                                    : strength === 'Fair'
                                        ? 'warning'
                                        : strength === 'Good'
                                            ? 'info'
                                            : 'success'
                            }
                            sx={{ height: 8, borderRadius: 999, mb: 1.25 }}
                        />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                            <Typography variant="caption" color={checks.length ? 'success.main' : 'text.secondary'}>
                                • At least 8 characters
                            </Typography>
                            <Typography variant="caption" color={checks.uppercase ? 'success.main' : 'text.secondary'}>
                                • One uppercase letter
                            </Typography>
                            <Typography variant="caption" color={checks.number ? 'success.main' : 'text.secondary'}>
                                • One number
                            </Typography>
                            <Typography variant="caption" color={checks.special ? 'success.main' : 'text.secondary'}>
                                • One special character
                            </Typography>
                        </Box>
                    </Box>

                    <TextField
                        label="Confirm new password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        fullWidth
                        margin="normal"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={!!confirmPasswordError}
                        helperText={confirmPasswordError}
                        autoComplete="new-password"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockOutlinedIcon color={confirmPasswordError ? 'error' : 'action'} fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        edge="end"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                                    >
                                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                            mt: 2,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                            },
                            borderRadius: 999,
                            py: 1.4,
                            fontWeight: 700,
                            mb: 2,
                        }}
                    >
                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Save New Password'}
                    </Button>

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Back to{' '}
                            <Link
                                component="button"
                                type="button"
                                variant="body2"
                                color="primary"
                                fontWeight={600}
                                underline="hover"
                                onClick={() => navigate('/login')}
                            >
                                sign in
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </AppShell>
    );
};

export default NewPasswordPage;
