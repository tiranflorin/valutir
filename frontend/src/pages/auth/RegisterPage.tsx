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
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerRequest } from '../../services/auth';
import ThemeModeToggle from '../../components/ThemeModeToggle';
import '../RecurringScreens.css';

type StrengthLevel = 'Weak' | 'Fair' | 'Good' | 'Strong';

const RegisterPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    if (isAuthenticated) {
        return <Navigate to="/my-subs" replace />;
    }

    const passwordChecks = useMemo(() => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
        };
    }, [password]);

    const passedChecks = Object.values(passwordChecks).filter(Boolean).length;

    const passwordStrength = useMemo((): StrengthLevel => {
        if (passedChecks <= 1) return 'Weak';
        if (passedChecks === 2) return 'Fair';
        if (passedChecks === 3) return 'Good';
        return 'Strong';
    }, [passedChecks]);

    const strengthProgress = useMemo(() => {
        return (passedChecks / 4) * 100;
    }, [passedChecks]);

    const strengthColor = useMemo(() => {
        switch (passwordStrength) {
            case 'Weak':
                return 'error';
            case 'Fair':
                return 'warning';
            case 'Good':
                return 'info';
            case 'Strong':
                return 'success';
            default:
                return 'primary';
        }
    }, [passwordStrength]);

    const validate = () => {
        let valid = true;

        setNameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmPasswordError('');
        setError('');

        if (!name.trim()) {
            setNameError('Full name is required');
            valid = false;
        }

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
        } else if (passwordStrength === 'Weak' || passwordStrength === 'Fair') {
            setPasswordError('Password strength must be at least Good');
            valid = false;
        }

        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            valid = false;
        } else if (password !== confirmPassword) {
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
            await registerRequest({ name: name.trim(), email, password });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Box className="auth-page">
                <ThemeModeToggle placement="floating" />
            <main className="login-layout register-layout">
                    <section className="login-panel auth-success-panel">
                        <img className="login-logo" src={theme.palette.mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 1.5 }} />
                        <div className="login-intro">
                            <h1>Account created</h1>
                            <p>Your account is ready. Sign in to start tracking.</p>
                        </div>
                        <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate('/login')}>
                            Go to sign in
                        </Button>
                    </section>
                    <aside className="login-side">
                        <div className="section-kicker">A clearer recurring bill list</div>
                        <h2>Your next renewal is easier to see.</h2>
                        <p>Add services as you go, then check their costs and dates in one place.</p>
                    </aside>
                </main>
            </Box>
        );
    }

    return (
        <Box className="auth-page">
            <ThemeModeToggle placement="floating" />
            <main className="login-layout register-layout">
                <section className="login-panel">
                    <a href="/" aria-label="ValuTir home">
                    <img className="login-logo" src={theme.palette.mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                    </a>
                        <div className="login-intro">
                        <h1>Create account</h1>
                        <p>Set up your account</p>
                    </div>

                    {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

                    <Box component="form" className="login-form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        label="Full name"
                        fullWidth
                        margin="normal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!nameError}
                        helperText={nameError}
                        autoComplete="name"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PersonOutlineIcon color={nameError ? 'error' : 'action'} fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

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
                                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
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
                            <Typography variant="body2" color={`${strengthColor}.main`} fontWeight={700}>
                                {passwordStrength}
                            </Typography>
                        </Box>

                        <LinearProgress
                            variant="determinate"
                            value={strengthProgress}
                            color={strengthColor}
                            sx={{
                                height: 8,
                                borderRadius: 999,
                                mb: 1.25,
                            }}
                        />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                            <Typography variant="caption" color={passwordChecks.length ? 'success.main' : 'text.secondary'}>
                                • At least 8 characters
                            </Typography>
                            <Typography variant="caption" color={passwordChecks.uppercase ? 'success.main' : 'text.secondary'}>
                                • One uppercase letter
                            </Typography>
                            <Typography variant="caption" color={passwordChecks.number ? 'success.main' : 'text.secondary'}>
                                • One number
                            </Typography>
                            <Typography variant="caption" color={passwordChecks.special ? 'success.main' : 'text.secondary'}>
                                • One special character
                            </Typography>
                        </Box>
                    </Box>

                    <TextField
                        label="Confirm password"
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
                                        {showConfirmPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        className="login-submit"
                        disabled={loading}
                        sx={{
                            mt: 2,
                        }}
                    >
                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
                    </Button>

                    <div className="login-signup">
                        Already have an account?{' '}
                        <Link component="button" type="button" underline="hover" fontWeight={700} onClick={() => navigate('/login')}>
                            Sign in
                        </Link>
                    </div>
                </Box>
                </section>
                <aside className="login-side">
                    <div className="section-kicker">Free to start</div>
                    <h2>Make room for the subscriptions that matter.</h2>
                    <p>Keep personal costs and renewals in view. No bank connection or payment card is needed to get started.</p>
                    <div className="login-proof">
                        <span>Track trial end dates and first charges</span>
                        <span>See monthly and yearly costs together</span>
                        <span>Personal and Business views included</span>
                    </div>
                </aside>
            </main>
        </Box>
    );
};

export default RegisterPage;
