import React, { useCallback, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField } from '@mui/material';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import TurnstileWidget from '../components/TurnstileWidget';
import { submitContactForm } from '../services/contact';
import './RecurringScreens.css';
import './ContactPage.css';

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';

const ContactPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [notice, setNotice] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [widgetKey, setWidgetKey] = useState(0);

    const handleTokenChange = useCallback((token: string) => {
        setTurnstileToken(token);
        if (token) setVerificationError('');
    }, []);
    const handleVerificationError = useCallback((error: string) => {
        setVerificationError(error);
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setNotice('');
        setVerificationError('');

        if (honeypot.trim()) return;
        if (!turnstileSiteKey) {
            setVerificationError('Bot verification is not configured. Your message was not sent.');
            return;
        }
        if (!turnstileToken) {
            setVerificationError('Complete the bot verification before continuing.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitContactForm({
                email,
                message,
                website: honeypot,
                turnstileToken,
            });
            setNotice(result.message);
        } catch (error) {
            setVerificationError(error instanceof Error ? error.message : 'Could not verify your message. Please try again.');
        } finally {
            setTurnstileToken('');
            setWidgetKey((key) => key + 1);
            setIsSubmitting(false);
        }
    };

    return (
        <Box className="dashboard-page settings-page contact-page">
            <AppHeader />
            <Container className="settings-container contact-container">
                <Box className="settings-page-heading">
                    <h1>Contact us</h1>
                    <p>Have a question or feedback? Send us a message.</p>
                </Box>

                <Paper className="settings-card contact-card">
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2.5}>
                            <TextField
                                label="Email address"
                                type="email"
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    setNotice('');
                                }}
                                autoComplete="email"
                                required
                                fullWidth
                            />
                            <TextField
                                label="Message"
                                value={message}
                                onChange={(event) => {
                                    setMessage(event.target.value);
                                    setNotice('');
                                }}
                                required
                                fullWidth
                                multiline
                                minRows={6}
                            />
                            <Box className="contact-honeypot" aria-hidden="true">
                                <label htmlFor="contact-website">Leave this field empty</label>
                                <input
                                    id="contact-website"
                                    name="website"
                                    type="text"
                                    value={honeypot}
                                    onChange={(event) => setHoneypot(event.target.value)}
                                    tabIndex={-1}
                                    autoComplete="off"
                                />
                            </Box>
                            {turnstileSiteKey ? (
                                <TurnstileWidget
                                    key={widgetKey}
                                    siteKey={turnstileSiteKey}
                                    onTokenChange={handleTokenChange}
                                    onError={handleVerificationError}
                                />
                            ) : (
                                <Alert severity="info">
                                    Bot verification will appear here once a Turnstile site key is configured.
                                </Alert>
                            )}
                            {verificationError && <Alert severity="error" role="alert">{verificationError}</Alert>}
                            {notice && <Alert severity="info" role="status">{notice}</Alert>}
                            <Box className="settings-save-row">
                                <Button type="submit" variant="contained" disabled={isSubmitting}>
                                    Send message
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                </Paper>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default ContactPage;
