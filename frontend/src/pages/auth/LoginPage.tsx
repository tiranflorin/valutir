import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Link,
    TextField,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import ThemeModeToggle from '../../components/ThemeModeToggle';
import '../RecurringScreens.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const { mode } = useAppTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/my-subs';

    if (isAuthenticated) {
        return <Navigate to="/my-subs" replace />;
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setEmailError('');
        setPasswordError('');
        setError('');

        let valid = true;
        if (!email.trim()) {
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
        if (!valid) return;

        try {
            setLoading(true);
            await login(email, password);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box className="auth-page">
            <ThemeModeToggle placement="floating" />
            <main className="login-layout">
                <section className="login-panel">
                    <a href="/" aria-label="ValuTir home">
                    <img className="login-logo" src={mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                    </a>
                        <div className="login-intro">
                        <h1>Welcome back</h1>
                        <p>Sign in to see what renews next.</p>
                    </div>

                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                    <Box component="form" className="login-form" onSubmit={handleSubmit} noValidate>
                        <TextField
                            label="Email address"
                            type="email"
                            fullWidth
                            margin="normal"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            error={Boolean(emailError)}
                            helperText={emailError}
                            autoComplete="email"
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><EmailOutlinedIcon fontSize="small" /></InputAdornment>,
                            }}
                        />
                        <TextField
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            margin="normal"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            error={Boolean(passwordError)}
                            helperText={passwordError}
                            autoComplete="current-password"
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment>,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => setShowPassword((previous) => !previous)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 2 }}>
                            <Link href="/request-password-reset" underline="hover" sx={{ color: 'primary.main', fontSize: 13, fontWeight: 650 }}>
                                Forgot password?
                            </Link>
                        </Box>
                        <Button type="submit" fullWidth variant="contained" className="login-submit" disabled={loading}>
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
                        </Button>
                        <div className="login-signup">
                            Don&apos;t have an account? <Link href="/register" underline="hover">Try it out</Link>
                        </div>
                    </Box>
                </section>

                <aside className="login-side">
                    <div className="section-kicker">Your recurring costs, back in view</div>
                    <h2>Pick up where you left off.</h2>
                    <p>Keep your services, trial dates and upcoming charges together, so the next renewal doesn’t take you by surprise.</p>
                    <div className="login-proof">
                        <span>See trials before the first charge</span>
                        <span>Know your monthly and yearly totals</span>
                        <span>Free to use for your everyday list</span>
                    </div>
                </aside>
            </main>
        </Box>
    );
};

export default LoginPage;
