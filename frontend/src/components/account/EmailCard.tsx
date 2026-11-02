import React, { useState } from 'react';
import { Alert, Box, Button, Paper, TextField } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile, requestEmailChange } from '../../services/account';
import { useAccountErrorHandler } from './useAccountErrorHandler';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailCard: React.FC = () => {
    const { user, token, applyProfile } = useAuth();
    const handleError = useAccountErrorHandler();
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    const emailValid = EMAIL_PATTERN.test(newEmail.trim());
    const sameAsCurrent = newEmail.trim().toLowerCase() === user?.email.toLowerCase();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (!token) {
            return;
        }
        try {
            setSaving(true);
            const result = await requestEmailChange(token, newEmail.trim(), currentPassword);
            setSuccess(result.message);
            setNewEmail('');
            setCurrentPassword('');
            applyProfile(await fetchProfile(token));
        } catch (submitError) {
            const message = handleError(submitError);
            if (message) {
                setError(message);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper className="settings-card">
            <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
                <div className="settings-section-heading">
                    <h2>Email address</h2>
                    <p>
                        You sign in with <strong>{user?.email}</strong>. To change it, we send a confirmation link
                        to the new address; your email changes once you open it, and every device is signed out.
                    </p>
                </div>
                {user?.pendingEmail && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Waiting for confirmation of <strong>{user.pendingEmail}</strong>. Check that inbox, or request a new link below.
                    </Alert>
                )}
                <div className="settings-password-grid">
                    <TextField
                        label="New email address"
                        type="email"
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        autoComplete="email"
                        inputProps={{ maxLength: 180 }}
                        error={Boolean(newEmail) && (!emailValid || sameAsCurrent)}
                        helperText={newEmail && sameAsCurrent ? 'This is already your email address.' : newEmail && !emailValid ? 'Enter a valid email address.' : ' '}
                        required
                        fullWidth
                    />
                    <TextField
                        label="Current password"
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        autoComplete="current-password"
                        helperText="Required to change your email."
                        required
                        fullWidth
                    />
                </div>
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
                <div className="settings-save-row">
                    <Button type="submit" variant="contained" disabled={saving || !emailValid || sameAsCurrent || !currentPassword}>
                        {saving ? 'Sending...' : 'Send confirmation link'}
                    </Button>
                </div>
            </Box>
        </Paper>
    );
};

export default EmailCard;
