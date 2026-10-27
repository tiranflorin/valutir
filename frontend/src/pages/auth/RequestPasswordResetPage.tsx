import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, InputAdornment, Link, TextField } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../../services/auth';
import { useAppTheme } from '../../context/ThemeContext';
import ThemeModeToggle from '../../components/ThemeModeToggle';
import '../RecurringScreens.css';

const RequestPasswordResetPage: React.FC = () => {
    const navigate = useNavigate();
    const { mode } = useAppTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [emailError, setEmailError] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setEmailError('');
        setError('');
        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Enter a valid email address');
            return;
        }

        try {
            setLoading(true);
            await requestPasswordReset(email);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not request password reset');
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
                    <img className="login-logo" src={mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                    </a>
                        {success ? (
                        <>
                            <CheckCircleIcon sx={{ display: 'block', mx: 'auto', mb: 1.5, fontSize: 54, color: 'success.main' }} />
                            <div className="login-intro">
                                <h1>Check your email</h1>
                                <p>If the email is registered, reset instructions have been sent to {email}.</p>
                            </div>
                            <p className="reset-helper">Check your inbox and spam folder, then follow the reset instructions.</p>
                            <Button
                                fullWidth
                                variant="outlined"
                                className="reset-secondary"
                                onClick={() => { setSuccess(false); setEmail(''); }}
                            >
                                Try another email
                            </Button>
                            <div className="login-signup">
                                Remember your password? <Link component="button" type="button" onClick={() => navigate('/login')}>Sign in</Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="login-intro">
                                <h1>Forgot password?</h1>
                                <p>We’ll send you a link to reset it.</p>
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
                                <Button type="submit" fullWidth variant="contained" className="login-submit" disabled={loading}>
                                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Send reset link'}
                                </Button>
                                <div className="login-signup">
                                    Remember your password? <Link component="button" type="button" onClick={() => navigate('/login')}>Sign in</Link>
                                </div>
                            </Box>
                        </>
                    )}
                </section>
                <aside className="login-side">
                    <div className="section-kicker">Account access</div>
                    <h2>We’ll help you get back to your recurring expenses.</h2>
                    <p>Enter the address you used to register and follow the instructions sent to your inbox.</p>
                    <div className="login-proof">
                        <span>Reset links are sent by email</span>
                        <span>Your subscriptions stay in your account</span>
                    </div>
                </aside>
            </main>
        </Box>
    );
};

export default RequestPasswordResetPage;
