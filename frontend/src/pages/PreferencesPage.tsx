import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, MenuItem, Paper, TextField } from '@mui/material';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAccountErrorHandler } from '../components/account/useAccountErrorHandler';
import { useAuth } from '../context/AuthContext';
import { currencyOptions, updateProfile, type DefaultCurrency } from '../services/account';

const PreferencesPage: React.FC = () => {
    const { user, token, applyProfile } = useAuth();
    const handleError = useAccountErrorHandler();
    const savedCurrency = user?.defaultCurrency ?? 'EUR';
    const [currency, setCurrency] = useState<DefaultCurrency>(savedCurrency);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Show the account's saved currency once the profile has loaded.
    useEffect(() => {
        setCurrency(savedCurrency);
    }, [savedCurrency]);

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        if (!token) {
            return;
        }
        try {
            setSaving(true);
            applyProfile(await updateProfile(token, { defaultCurrency: currency }));
            setSaved(true);
        } catch (saveError) {
            const message = handleError(saveError);
            if (message) {
                setError(message);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box className="dashboard-page settings-page">
            <AppHeader />
            <Container className="settings-container">
                <Box className="settings-page-heading">
                    <h1>Preferences</h1>
                    <p>Choose the default currency for new subscriptions.</p>
                </Box>

                <Paper className="settings-card">
                    <Box component="form" onSubmit={(event) => void handleSave(event)}>
                        <div className="settings-section-heading">
                            <h2>Default currency</h2>
                            <p>This currency is preselected when you add a subscription, on every device you use. Existing records keep their original amount and currency.</p>
                        </div>

                        <TextField
                            select
                            label="Default currency"
                            value={currency}
                            onChange={(event) => {
                                setCurrency(event.target.value as DefaultCurrency);
                                setSaved(false);
                            }}
                            fullWidth
                        >
                            {currencyOptions.map((option) => (
                                <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
                            ))}
                        </TextField>

                        <div className="currency-preview">
                            <span>Current selection</span>
                            <strong>{currencyOptions.find((option) => option.code === currency)?.label}</strong>
                            <small>Amounts are still shown in each subscription’s saved currency.</small>
                        </div>

                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                        {saved && <Alert severity="success" sx={{ mt: 2 }}>Your default currency has been saved to your account.</Alert>}

                        <div className="settings-save-row">
                            <Button type="submit" variant="contained" disabled={saving || currency === savedCurrency}>
                                {saving ? 'Saving...' : 'Save preference'}
                            </Button>
                        </div>
                    </Box>
                </Paper>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default PreferencesPage;
