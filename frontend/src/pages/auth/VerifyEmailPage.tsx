import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import ThemeModeToggle from '../../components/ThemeModeToggle';
import { fetchProfile, verifyEmail } from '../../services/account';
import '../RecurringScreens.css';
import SuccessHeading from '../../components/SuccessHeading';

type Status = 'verifying' | 'verified' | 'failed';

/**
 * Opened from the link emailed after sign-up. Public: it works whether or not the browser is
 * signed in, because the link's token is the credential.
 */
const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { mode } = useAppTheme();
    const { isAuthenticated, token: sessionToken, applyProfile } = useAuth();
    const token = searchParams.get('token') ?? '';
    const [status, setStatus] = useState<Status>(token ? 'verifying' : 'failed');
    const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.');
    const submitted = useRef(false);

    useEffect(() => {
        // Verify once, even if React runs effects twice in development.
        if (!token || submitted.current) {
            return;
        }
        submitted.current = true;
        verifyEmail(token)
            .then(async (result) => {
                setMessage(result.message);
                setStatus('verified');
                // Signed in here too: refresh the account so the banner goes away.
                if (sessionToken) {
                    applyProfile(await fetchProfile(sessionToken));
                }
            })
            .catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : 'This verification link is invalid or expired.');
                setStatus('failed');
            });
    }, [token, sessionToken, applyProfile]);

    const next = isAuthenticated ? '/my-subs' : '/login';

    return (
        <Box className="auth-page">
            <ThemeModeToggle placement="floating" />
            <main className="login-layout auth-reset-layout">
                <section className="login-panel">
                    <img className="login-logo" src={mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                    {status === 'verifying' && (
                        <div className="login-intro">
                            <h1>Confirming your email…</h1>
                            <CircularProgress size={28} />
                        </div>
                    )}
                    {status === 'verified' && (
                        <>
                            <div className="login-intro">
                                <SuccessHeading title="Email confirmed" />
                                <p>{message}</p>
                            </div>
                            <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate(next, { replace: true })}>
                                {isAuthenticated ? 'Go to your subscriptions' : 'Sign in'}
                            </Button>
                        </>
                    )}
                    {status === 'failed' && (
                        <>
                            <div className="login-intro">
                                <h1>Link not valid</h1>
                            </div>
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{message}</Alert>
                            <p className="reset-helper">
                                Links expire after 24 hours and only the most recent one works. Sign in and use “Resend link” in the banner at the top of the page to get a new one.
                            </p>
                            <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate(next)}>
                                {isAuthenticated ? 'Go to your subscriptions' : 'Sign in'}
                            </Button>
                        </>
                    )}
                </section>
            </main>
        </Box>
    );
};

export default VerifyEmailPage;
