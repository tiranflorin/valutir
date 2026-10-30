import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Container,
    Paper,
    Stack,
    TextField,
} from '@mui/material';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { VITE_API_URL } from '../services/auth';

const ProfilePage: React.FC = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
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
    const initials = user?.name?.slice(0, 1)?.toUpperCase() || user?.email?.slice(0, 1)?.toUpperCase() || 'U';

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (strengthScore < 3) {
            setError('Use a password that meets at least three of the four requirements below.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('The new passwords do not match.');
            return;
        }
        if (!token) {
            setError('You are not authenticated.');
            return;
        }

        try {
            setSaving(true);
            const response = await fetch(`${VITE_API_URL}/api/profile/password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                logout();
                navigate('/login', { replace: true });
                return;
            }
            if (!response.ok) {
                throw new Error(data?.message || 'Unable to update your password.');
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess('Your password has been updated.');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box className="dashboard-page settings-page">
            <AppHeader />
            <Container className="settings-container">
                <Box className="settings-page-heading">
                    {/*<span className="section-kicker">ACCOUNT SETTINGS</span>*/}
                    <h1>Your profile</h1>
                    <p>Manage your account and sign-in details.</p>
                </Box>

                <Paper className="settings-card">
                    <div className="settings-profile-row">
                        <Avatar className="settings-avatar">{initials}</Avatar>
                        <div>
                            <strong>{user?.name || 'Personal account'}</strong>
                            <span>{user?.email || 'Account details and sign-in settings'}</span>
                        </div>
                    </div>

                    <div className="settings-section-heading">
                        <h2>Password</h2>
                        <p>Change the password used to sign in to your account.</p>
                    </div>

                    <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
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
                                disabled={saving || !currentPassword || !newPassword || !confirmPassword || strengthScore < 3 || newPassword !== confirmPassword}
                            >
                                {saving ? 'Updating...' : 'Update password'}
                            </Button>
                        </div>
                    </Box>
                </Paper>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default ProfilePage;
