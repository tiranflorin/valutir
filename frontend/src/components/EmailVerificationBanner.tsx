import React, { useState } from 'react';
import { Alert, Button, Container } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { resendEmailVerification } from '../services/account';

/**
 * Shown on signed-in pages until the account's email is confirmed. Hidden while the profile is
 * still loading (emailVerified undefined), so verified users never see it flash.
 */
const EmailVerificationBanner: React.FC = () => {
    const { isAuthenticated, token, user } = useAuth();
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

    if (!isAuthenticated || user?.emailVerified !== false) {
        return null;
    }

    const resend = async () => {
        if (!token) {
            return;
        }
        setSending(true);
        try {
            const { message } = await resendEmailVerification(token);
            setResult({ severity: 'success', message });
        } catch (err) {
            setResult({ severity: 'error', message: err instanceof Error ? err.message : 'Unable to send a new confirmation link.' });
        } finally {
            setSending(false);
        }
    };

    return (
        <Container maxWidth="xl" className="email-verification-banner">
            <Alert
                severity={result?.severity ?? 'warning'}
                role="status"
                action={
                    result?.severity === 'success' ? undefined : (
                        <Button color="inherit" size="small" onClick={() => void resend()} disabled={sending}>
                            {sending ? 'Sending…' : 'Resend link'}
                        </Button>
                    )
                }
            >
                {result?.message ?? (
                    <>
                        Confirm your email address <strong>{user.email}</strong> using the link we sent you. Until then,
                        payment reminders and the one-time upgrade are off.
                    </>
                )}
            </Alert>
        </Container>
    );
};

export default EmailVerificationBanner;
