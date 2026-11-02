import React, { useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, FormControlLabel, Paper, Switch, TextField } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/account';
import { useAccountErrorHandler } from './useAccountErrorHandler';

/** Default for accounts that never picked one: Frankfurt, where the app is hosted (matches the backend). */
const DEFAULT_TIMEZONE = 'Europe/Berlin';

const browserTimezone = (): string | null => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
        return null;
    }
};

const allTimezones = (): string[] => {
    try {
        return Intl.supportedValuesOf('timeZone');
    } catch {
        return [DEFAULT_TIMEZONE];
    }
};

const RemindersCard: React.FC = () => {
    const { user, token, applyProfile } = useAuth();
    const handleError = useAccountErrorHandler();
    const savedTimezone = user?.timezone ?? DEFAULT_TIMEZONE;
    const remindersEnabled = user?.remindersEnabled ?? true;
    // null until the user picks one, so the saved value shows as soon as the profile loads.
    const [draftTimezone, setDraftTimezone] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    const timezone = draftTimezone ?? savedTimezone;
    const detected = useMemo(() => browserTimezone(), []);
    const options = useMemo(() => {
        const zones = allTimezones();
        return zones.includes(savedTimezone) ? zones : [savedTimezone, ...zones];
    }, [savedTimezone]);

    const save = async (changes: { timezone?: string; remindersEnabled?: boolean }, message: string) => {
        setError('');
        setSuccess('');
        if (!token) {
            return;
        }
        try {
            setSaving(true);
            applyProfile(await updateProfile(token, changes));
            setDraftTimezone(null);
            setSuccess(message);
        } catch (saveError) {
            const text = handleError(saveError);
            if (text) {
                setError(text);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper className="settings-card">
            <div className="settings-section-heading">
                <h2>Payment reminders</h2>
                <p>
                    An email only on days when a payment needs your attention, shortly after 1:00 at night in your
                    time zone: 2 days before a trial ends, and 1 to 7 days before a renewal depending on how often it
                    bills. Each payment is reminded once.
                </p>
            </div>

            <FormControlLabel
                control={(
                    <Switch
                        checked={remindersEnabled}
                        disabled={saving}
                        onChange={(event) => void save(
                            { remindersEnabled: event.target.checked },
                            event.target.checked ? 'Payment reminders are on.' : "Payment reminders are off. You won't get these emails.",
                        )}
                    />
                )}
                label="Email me before upcoming payments"
            />

            <Box sx={{ mt: 2 }}>
                <Autocomplete
                    options={options}
                    value={timezone}
                    disableClearable
                    onChange={(_, next) => {
                        setDraftTimezone(next);
                        setSuccess('');
                    }}
                    renderInput={(params) => (
                        <TextField {...params} label="Time zone" helperText="Used for when reminders arrive and which day counts as today." />
                    )}
                />
                {detected && detected !== timezone && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => setDraftTimezone(detected)}>
                        Use {detected} (this device)
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

            <div className="settings-save-row">
                <Button
                    variant="contained"
                    disabled={saving || timezone === savedTimezone}
                    onClick={() => void save({ timezone }, `Your time zone is now ${timezone}.`)}
                >
                    {saving ? 'Saving...' : 'Save time zone'}
                </Button>
            </div>
        </Paper>
    );
};

export default RemindersCard;
