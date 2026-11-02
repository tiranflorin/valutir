import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/account';
import { useAccountErrorHandler } from './useAccountErrorHandler';

const PasswordCard: React.FC = () => {
    const { token, replaceToken } = useAuth();
    const handleError = useAccountErrorHandler();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    const passwordChecks = useMemo(() => ({
        length: newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        number: /\d/.test(newPassword),
        symbol: /[^A-Za-z0-9]/.test(newPassword),
    }), [newPassword]);
    const strengthScore = Object.values(passwordChecks).filter(Boolean).length;
    const meetsPasswordPolicy = passwordChecks.length && strengthScore >= 3;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!meetsPasswordPolicy) {
            setError('Use at least 8 characters, plus any two of uppercase, number, or symbol.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('The new passwords do not match.');
            return;
        }
        if (!token) {
            return;
        }

        try {
            setSaving(true);
            const result = await changePassword(token, currentPassword, newPassword);
            // The old token was revoked along with every other device; keep this one signed in.
            replaceToken(result.token);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess(result.message);
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
                    <h2>Password</h2>
                    <p>Change the password used to sign in. Other devices are signed out; this one stays signed in.</p>
                </div>
                <div className="settings-password-grid">
                    <TextField
                        label="Current password"
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                        fullWidth
                    />
                    <TextField
                        label="New password"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        helperText="At least 8 characters, plus any two of uppercase, number, or symbol."
                        required
                        fullWidth
                    />
                    <TextField
                        label="Confirm new password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        error={Boolean(confirmPassword) && newPassword !== confirmPassword}
                        helperText={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match.' : ' '}
                        required
                        fullWidth
                    />
                </div>

                <Stack className="password-requirements" direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                    <span className={passwordChecks.length ? 'met' : ''}>8+ characters</span>
                    <span className={passwordChecks.uppercase ? 'met' : ''}>Uppercase letter</span>
                    <span className={passwordChecks.number ? 'met' : ''}>Number</span>
                    <span className={passwordChecks.symbol ? 'met' : ''}>Symbol</span>
                </Stack>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

                <div className="settings-save-row">
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={saving || !currentPassword || !newPassword || !confirmPassword || !meetsPasswordPolicy || newPassword !== confirmPassword}
                    >
                        {saving ? 'Updating...' : 'Update password'}
                    </Button>
                </div>
            </Box>
        </Paper>
    );
};

export default PasswordCard;
