import React, { useState } from 'react';
import { Alert, Box, Button, Container, MenuItem, Paper, TextField } from '@mui/material';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { getDefaultCurrency, saveDefaultCurrency, type DefaultCurrency } from '../services/preferences';

const currencyOptions: { code: DefaultCurrency; label: string }[] = [
    { code: 'EUR', label: 'EUR · Euro (€)' },
    { code: 'USD', label: 'USD · US Dollar ($)' },
    { code: 'RON', label: 'RON · Romanian Leu (lei)' },
];

const PreferencesPage: React.FC = () => {
    const { user } = useAuth();
    const [currency, setCurrency] = useState<DefaultCurrency>(() => getDefaultCurrency(user?.email));
    const [saved, setSaved] = useState(false);

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        saveDefaultCurrency(user?.email, currency);
        setSaved(true);
    };

    return (
        <Box className="dashboard-page settings-page">
            <AppHeader />
            <Container className="settings-container">
                <Box className="settings-page-heading">
                    {/*<span className="section-kicker">ACCOUNT SETTINGS</span>*/}
                    <h1>Preferences</h1>
                    <p>Choose the default currency for new subscriptions.</p>
                </Box>

                <Paper className="settings-card">
                    <Box component="form" onSubmit={handleSave}>
                        <div className="settings-section-heading">
                            <h2>Default currency</h2>
                            <p>This currency is preselected when you add a subscription. Existing records keep their original amount and currency.</p>
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

                        {saved && <Alert severity="success" sx={{ mt: 2 }}>Your default currency has been saved on this device.</Alert>}

                        <div className="settings-save-row">
                            <Button type="submit" variant="contained">Save preference</Button>
                        </div>
                    </Box>
                </Paper>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default PreferencesPage;
