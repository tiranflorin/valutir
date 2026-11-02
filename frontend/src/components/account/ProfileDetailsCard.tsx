import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, TextField } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/account';
import { useAccountErrorHandler } from './useAccountErrorHandler';

const ProfileDetailsCard: React.FC = () => {
    const { user, token, applyProfile } = useAuth();
    const handleError = useAccountErrorHandler();
    const [name, setName] = useState(user?.name ?? '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    // Show the saved name once the profile has loaded.
    useEffect(() => {
        setName(user?.name ?? '');
    }, [user?.name]);

    const trimmedName = name.trim();
    const unchanged = trimmedName === (user?.name ?? '');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (!token || !trimmedName) {
            return;
        }
        try {
            setSaving(true);
            applyProfile(await updateProfile(token, { name: trimmedName }));
            setSuccess('Your name has been updated.');
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
                    <h2>Personal details</h2>
                    <p>The name shown in your account.</p>
                </div>
                <TextField
                    label="Full name"
                    value={name}
                    onChange={(event) => {
                        setName(event.target.value);
                        setSuccess('');
                    }}
                    autoComplete="name"
                    inputProps={{ maxLength: 255 }}
                    error={!trimmedName}
                    helperText={!trimmedName ? 'Name is required.' : ' '}
                    required
                    fullWidth
                />
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
                <div className="settings-save-row">
                    <Button type="submit" variant="contained" disabled={saving || !trimmedName || unchanged}>
                        {saving ? 'Saving...' : 'Save name'}
                    </Button>
                </div>
            </Box>
        </Paper>
    );
};

export default ProfileDetailsCard;
