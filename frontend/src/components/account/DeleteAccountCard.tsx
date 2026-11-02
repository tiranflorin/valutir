import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, TextField } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount } from '../../services/account';
import { useAccountErrorHandler } from './useAccountErrorHandler';

const DeleteAccountCard: React.FC = () => {
    const { token, clearSession } = useAuth();
    const navigate = useNavigate();
    const handleError = useAccountErrorHandler();
    const [currentPassword, setCurrentPassword] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        if (!token || !confirmed) {
            return;
        }
        try {
            setDeleting(true);
            await deleteAccount(token, currentPassword);
            clearSession();
            navigate('/', { replace: true });
        } catch (submitError) {
            const message = handleError(submitError);
            if (message) {
                setError(message);
            }
            setDeleting(false);
        }
    };

    return (
        <Paper className="settings-card settings-card-danger">
            <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
                <div className="settings-section-heading">
                    <h2>Delete account</h2>
                    <p>Permanently deletes your account and every subscription you track, including cancelled ones. This can't be undone.</p>
                </div>
                <TextField
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    fullWidth
                />
                <FormControlLabel
                    sx={{ mt: 1 }}
                    control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
                    label="I understand my account and all of its data will be permanently deleted."
                />
                {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                <div className="settings-save-row">
                    <Button type="submit" variant="contained" color="error" disabled={deleting || !currentPassword || !confirmed}>
                        {deleting ? 'Deleting...' : 'Delete my account'}
                    </Button>
                </div>
            </Box>
        </Paper>
    );
};

export default DeleteAccountCard;
