import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Stack,
    Typography,
    Paper,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { VITE_API_URL } from '../../services/auth';

type Props = {
    subscriptionId: number;
    token: string;
    onUnauthorized: () => void;
    onDeleted: () => void;
};

const SubscriptionDeleteCard: React.FC<Props> = ({
                                                     subscriptionId,
                                                     token,
                                                     onUnauthorized,
                                                     onDeleted,
                                                 }) => {
    const [usedAndUseful, setUsedAndUseful] = useState<boolean | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (usedAndUseful === null) {
            setError('Please answer whether this subscription was actually used and useful.');
            return;
        }

        try {
            setDeleting(true);
            setError('');

            const response = await fetch(`${VITE_API_URL}/api/subs/${subscriptionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ usedAndUseful }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                onUnauthorized();
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to delete subscription.');
            }

            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Paper className="subscription-review-panel">
            <div className="subscription-review-stepper" aria-label={`Step ${step} of 2`}>
                <span className={step === 1 ? 'current' : 'complete'}>01 <small>Review</small></span>
                <i aria-hidden="true" />
                <span className={step === 2 ? 'current' : ''}>02 <small>Remove</small></span>
            </div>

            {step === 1 ? (
                <Stack spacing={2.25}>
                    <Box>
                        <span className="subscription-review-kicker">QUICK REVIEW</span>
                        <Typography component="h2" className="subscription-review-title">
                            Was it useful to you?
                        </Typography>
                        <Typography className="subscription-review-copy">
                            Your answer helps you reflect on the service before removing it from your tracker.
                        </Typography>
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                        <Button
                            variant={usedAndUseful === true ? 'contained' : 'outlined'}
                            className={`subscription-review-choice ${usedAndUseful === true ? 'selected-useful' : ''}`}
                            onClick={() => setUsedAndUseful(true)}
                        >
                            Yes, I used it and it was useful
                        </Button>
                        <Button
                            variant={usedAndUseful === false ? 'contained' : 'outlined'}
                            className={`subscription-review-choice ${usedAndUseful === false ? 'selected-not-useful' : ''}`}
                            onClick={() => setUsedAndUseful(false)}
                        >
                            No, it wasn’t useful
                        </Button>
                    </Stack>

                    <div className="subscription-review-footer">
                        <p>Your answer is only saved if you remove this subscription.</p>
                        <Button
                            variant="contained"
                            disabled={usedAndUseful === null}
                            onClick={() => setStep(2)}
                        >
                            Continue to removal
                        </Button>
                    </div>
                </Stack>
            ) : (
                <Stack spacing={2.25}>
                    <Box>
                        <span className="subscription-review-kicker">FINAL STEP</span>
                        <Typography component="h2" className="subscription-review-title">
                            Remove it from ValuTir?
                        </Typography>
                        <Typography className="subscription-review-copy">
                            This removes the subscription from your tracker. It does not cancel your plan with the provider.
                        </Typography>
                    </Box>

                    {error && <Alert severity="error">{error}</Alert>}

                    <div className="subscription-review-footer">
                        <Button variant="outlined" color="inherit" disabled={deleting} onClick={() => setStep(1)}>
                            Back to review
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteOutlineRoundedIcon />}
                            disabled={deleting}
                            onClick={handleDelete}
                        >
                            {deleting ? 'Removing...' : 'Remove subscription'}
                        </Button>
                    </div>
                </Stack>
            )}
        </Paper>
    );
};

export default SubscriptionDeleteCard;
