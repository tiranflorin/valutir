import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import ThemeModeToggle from '../../components/ThemeModeToggle';
import { confirmEmailChange } from '../../services/account';
import '../RecurringScreens.css';
import SuccessHeading from '../../components/SuccessHeading';

type Status = 'confirming' | 'confirmed' | 'failed';

/**
 * Opened from the link emailed to a new address. Public: it works whether or not the
 * browser is signed in, because the link's token is the credential.
 */
const ConfirmEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { mode } = useAppTheme();
    const { clearSession } = useAuth();
    const token = searchParams.get('token') ?? '';
    const [status, setStatus] = useState<Status>(token ? 'confirming' : 'failed');
    const [message, setMessage] = useState(token ? '' : 'This confirmation link is missing its token.');
    const submitted = useRef(false);

    useEffect(() => {
        // Confirm once, even if React runs effects twice in development.
        if (!token || submitted.current) {
            return;
        }
        submitted.current = true;
        confirmEmailChange(token)
            .then((result) => {
                // Every existing session was signed out by the change.
                clearSession();
                setMessage(result.message);
                setStatus('confirmed');
            })
            .catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : 'The confirmation link is invalid or expired.');
                setStatus('failed');
            });
    }, [token, clearSession]);

    return (
        <Box className="auth-page">
            <ThemeModeToggle placement="floating" />
            <main className="login-layout auth-reset-layout">
                <section className="login-panel">
                    <img className="login-logo" src={mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                    {status === 'confirming' && (
                        <div className="login-intro">
                            <h1>Confirming your email…</h1>
                            <CircularProgress size={28} />
                        </div>
                    )}
                    {status === 'confirmed' && (
                        <>
                            <div className="login-intro">
                                <SuccessHeading title="Email updated" />
                                <p>{message}</p>
                            </div>
                            <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate('/login', { replace: true })}>
                                Sign in
                            </Button>
                        </>
                    )}
                    {status === 'failed' && (
                        <>
                            <div className="login-intro">
                                <h1>Link not valid</h1>
                            </div>
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{message}</Alert>
                            <p className="reset-helper">Links expire after 24 hours and only the most recent one works. You can request a new one from your profile.</p>
                            <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate('/profile')}>
                                Go to your profile
                            </Button>
                        </>
                    )}
                </section>
            </main>
        </Box>
    );
};

export default ConfirmEmailPage;
