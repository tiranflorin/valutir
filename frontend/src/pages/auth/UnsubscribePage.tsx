import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppTheme } from '../../context/ThemeContext';
import ThemeModeToggle from '../../components/ThemeModeToggle';
import { unsubscribeFromReminders } from '../../services/account';
import '../RecurringScreens.css';
import SuccessHeading from '../../components/SuccessHeading';

type Status = 'working' | 'done' | 'failed';

/**
 * Opened from the "Turn them off" link in a reminder email. Public: the link's signed token
 * is the credential, so it works without signing in.
 */
const UnsubscribePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { mode } = useAppTheme();
    const token = searchParams.get('token') ?? '';
    const [status, setStatus] = useState<Status>(token ? 'working' : 'failed');
    const [message, setMessage] = useState(token ? '' : 'This unsubscribe link is missing its token.');
    const submitted = useRef(false);

    useEffect(() => {
        // Run once, even if React runs effects twice in development.
        if (!token || submitted.current) {
            return;
        }
        submitted.current = true;
        unsubscribeFromReminders(token)
            .then((result) => {
                setMessage(result.message);
                setStatus('done');
            })
            .catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : 'This unsubscribe link is invalid.');
                setStatus('failed');
            });
    }, [token]);

    return (
        <Box className="auth-page">
            <ThemeModeToggle placement="floating" />
            <main className="login-layout auth-reset-layout">
                <section className="login-panel">
                    <img className="login-logo" src={mode === 'dark' ? '/brand/logo-dark.svg' : '/brand/logo.svg'} alt="ValuTir — Track. Control. More value." />
                    {status === 'working' && (
                        <div className="login-intro">
                            <h1>Turning off reminders…</h1>
                            <CircularProgress size={28} />
                        </div>
                    )}
                    {status === 'done' && (
                        <>
                            <div className="login-intro">
                                <SuccessHeading title="Reminders turned off" />
                                <p>{message}</p>
                            </div>
                            <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate('/preferences')}>
                                Go to Preferences
                            </Button>
                        </>
                    )}
                    {status === 'failed' && (
                        <>
                            <div className="login-intro">
                                <h1>Link not valid</h1>
                            </div>
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{message}</Alert>
                            <p className="reset-helper">You can turn reminders off anytime in Preferences after signing in.</p>
                            <Button fullWidth variant="contained" className="login-submit" onClick={() => navigate('/preferences')}>
                                Go to Preferences
                            </Button>
                        </>
                    )}
                </section>
            </main>
        </Box>
    );
};

export default UnsubscribePage;
