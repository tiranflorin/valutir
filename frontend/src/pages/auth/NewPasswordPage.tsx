import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    LinearProgress,
    Link,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submitNewPassword } from '../../services/auth';
import ThemeModeToggle from '../../components/ThemeModeToggle';
import '../RecurringScreens.css';

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

    const checks = useMemo(() => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    }), [password]);
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const strength = useMemo((): StrengthLevel => {
        if (passedChecks <= 1) return 'Weak';
        if (passedChecks === 2) return 'Fair';
        if (passedChecks === 3) return 'Good';
        return 'Strong';
    }, [passedChecks]);
    const progress = (passedChecks / 4) * 100;
    const strengthColor = strength === 'Weak' ? 'error' : strength === 'Fair' ? 'warning' : strength === 'Good' ? 'info' : 'success';

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setPasswordError('');
        setConfirmPasswordError('');
        setError('');
        let valid = true;
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
        if (!valid) return;

        try {
            setLoading(true);
            await submitNewPassword(token, password);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box className="auth-page">
            <ThemeModeToggle placement="floating" />
            <main className="login-layout auth-reset-layout">
                <section className="login-panel">
                    <a href="/" aria-label="ValuTir home">
                    <img className="login-logo" src={theme.palette.mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                    </a>
                        {success ? (
                        <>
                            <CheckCircleIcon sx={{ display: 'block', mx: 'auto', mb: 1.5, fontSize: 54, color: 'success.main' }} />
                            <div className="login-intro">
                                <h1>Password updated</h1>
                                <p>Your password has been changed successfully. Sign in with your new password.</p>
                            </div>
                            <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate('/login')}>
                                Go to sign in
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="login-intro">
                                <h1>Set a new password</h1>
                                <p>Choose a strong password for your account.</p>
                            </div>
                            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                            <Box component="form" className="login-form" onSubmit={handleSubmit} noValidate>
                                <TextField
                                    label="New password"
                                    type={showPassword ? 'text' : 'password'}
                                    fullWidth
                                    margin="normal"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    error={Boolean(passwordError)}
                                    helperText={passwordError}
                                    autoComplete="new-password"
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment>,
                                        endAdornment: <InputAdornment position="end"><IconButton edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((previous) => !previous)}>{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment>,
                                    }}
                                />
                                <Box className="password-strength">
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                                        <Typography variant="body2" color="text.secondary">Password strength</Typography>
                                        <Typography variant="body2" fontWeight={700} color={`${strengthColor}.main`}>{strength}</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={progress} color={strengthColor} sx={{ height: 8, borderRadius: 999, mb: 1.25 }} />
                                    <Box className="password-rules">
                                        <Typography variant="caption" color={checks.length ? 'success.main' : 'text.secondary'}>• At least 8 characters</Typography>
                                        <Typography variant="caption" color={checks.uppercase ? 'success.main' : 'text.secondary'}>• One uppercase letter</Typography>
                                        <Typography variant="caption" color={checks.number ? 'success.main' : 'text.secondary'}>• One number</Typography>
                                        <Typography variant="caption" color={checks.special ? 'success.main' : 'text.secondary'}>• One special character</Typography>
                                    </Box>
                                </Box>
                                <TextField
                                    label="Confirm new password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    fullWidth
                                    margin="normal"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    error={Boolean(confirmPasswordError)}
                                    helperText={confirmPasswordError}
                                    autoComplete="new-password"
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment>,
                                        endAdornment: <InputAdornment position="end"><IconButton edge="end" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirmPassword((previous) => !previous)}>{showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment>,
                                    }}
                                />
                                <Button type="submit" fullWidth variant="contained" className="login-submit" disabled={loading}>
                                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Save new password'}
                                </Button>
                                <div className="login-signup">
                                    Back to <Link component="button" type="button" onClick={() => navigate('/login')}>sign in</Link>
                                </div>
                            </Box>
                        </>
                    )}
                </section>
                <aside className="login-side">
                    <div className="section-kicker">Secure account access</div>
                    <h2>Choose a password you can keep safe.</h2>
                    <p>Use a strong password that you don’t use for other services.</p>
                    <div className="login-proof">
                        <span>At least 8 characters</span>
                        <span>Include a capital, a number and a symbol</span>
                    </div>
                </aside>
            </main>
        </Box>
    );
};

export default NewPasswordPage;
