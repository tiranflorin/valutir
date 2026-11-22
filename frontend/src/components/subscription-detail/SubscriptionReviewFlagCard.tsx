import React, { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { useAuth } from '../../context/AuthContext';
import { useAccountErrorHandler } from '../../hooks/useAccountErrorHandler';
import { clearReviewFlag, flagForReview } from '../../services/subscriptions';
import type { SubscriptionCardModel, SubscriptionRecord } from '../../types/subscription';

type Props = {
    subscription: SubscriptionCardModel;
    onUpdated: (subscription: SubscriptionRecord) => void;
};

const NOTE_MAX = 500;

const flaggedOn = (iso: string | null | undefined) =>
    iso ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : null;

/**
 * "Flag for review": a reminder to yourself to decide whether to keep it. A flag, not a status:
 * the subscription stays as it is (still charged and reminded) until you keep, pause or cancel it.
 */
const SubscriptionReviewFlagCard: React.FC<Props> = ({ subscription, onUpdated }) => {
    const { token } = useAuth();
    const errorMessage = useAccountErrorHandler();
    const flagged = subscription.reviewFlagged === true;
    const [editing, setEditing] = useState(false);
    const [note, setNote] = useState(subscription.reviewNote ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const send = async (method: 'PUT' | 'DELETE') => {
        setError('');
        setSaving(true);
        try {
            const updated = method === 'PUT'
                ? await flagForReview(token, subscription.id, note.trim() || null)
                : await clearReviewFlag(token, subscription.id);
            setEditing(false);
            if (method === 'DELETE') setNote('');
            onUpdated(updated);
        } catch (err) {
            const message = errorMessage(err);
            if (message !== null) setError(message);
        } finally {
            setSaving(false);
        }
    };

    const noteField = (
        <TextField
            label="Note (optional)"
            placeholder="e.g. Check if the kids still use it"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            fullWidth
            inputProps={{ maxLength: NOTE_MAX }}
            helperText={`${note.length}/${NOTE_MAX}`}
        />
    );

    return (
        <Paper className={`subscription-review-card${flagged ? ' flagged' : ''}`} component="section" aria-labelledby="review-card-title">
            <Stack spacing={1.5}>
                <Box>
                    <Typography id="review-card-title" component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                        {flagged ? 'Flagged for review' : 'Not sure you still need it?'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {flagged
                            ? `Flagged on ${flaggedOn(subscription.reviewFlaggedAt)}. It’s still charged and reminded until you decide: keep it (clear the flag), pause it, or cancel it.`
                            : 'Flag it to decide later. Nothing changes: it’s still charged and reminded, and it shows under Needs review on your dashboard.'}
                    </Typography>
                </Box>

                {flagged && !editing && subscription.reviewNote && (
                    <Typography className="review-note" variant="body2">“{subscription.reviewNote}”</Typography>
                )}
                {(!flagged || editing) && noteField}
                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    {!flagged && (
                        <Button variant="outlined" startIcon={<FlagOutlinedIcon />} disabled={saving} onClick={() => void send('PUT')}>
                            {saving ? 'Saving...' : 'Flag for review'}
                        </Button>
                    )}
                    {flagged && editing && (
                        <>
                            <Button variant="contained" disabled={saving} onClick={() => void send('PUT')}>
                                {saving ? 'Saving...' : 'Save note'}
                            </Button>
                            <Button variant="text" disabled={saving} onClick={() => { setEditing(false); setNote(subscription.reviewNote ?? ''); }}>
                                Cancel
                            </Button>
                        </>
                    )}
                    {flagged && !editing && (
                        <>
                            <Button variant="contained" disabled={saving} onClick={() => void send('DELETE')}>
                                {saving ? 'Saving...' : 'Keep it, clear the flag'}
                            </Button>
                            <Button variant="text" disabled={saving} onClick={() => setEditing(true)}>
                                {subscription.reviewNote ? 'Edit note' : 'Add a note'}
                            </Button>
                        </>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
};

export default SubscriptionReviewFlagCard;
