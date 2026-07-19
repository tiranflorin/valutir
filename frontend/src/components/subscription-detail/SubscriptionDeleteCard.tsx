import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Stack,
    Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AppSurfaceCard from '../AppSurfaceCard';
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
        <AppSurfaceCard
            sx={{
                p: { xs: 3, md: 4 },
                border: (theme) => `1px solid ${theme.palette.error.light}`,
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Delete subscription
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Before removing it from your list, record whether it was actually used and useful for you.
                    </Typography>
                </Box>

                <Box>
                    <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                        Was this subscription actually used and useful?
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip
                            label="Yes"
                            clickable
                            color={usedAndUseful === true ? 'success' : 'default'}
                            onClick={() => setUsedAndUseful(true)}
                            sx={{ fontWeight: 700, borderRadius: 999 }}
                        />
                        <Chip
                            label="No"
                            clickable
                            color={usedAndUseful === false ? 'error' : 'default'}
                            onClick={() => setUsedAndUseful(false)}
                            sx={{ fontWeight: 700, borderRadius: 999 }}
                        />
                    </Stack>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        disabled={deleting || usedAndUseful === null}
                        onClick={handleDelete}
                        sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}
                    >
                        {deleting ? 'Deleting...' : 'Delete subscription'}
                    </Button>
                </Stack>
            </Stack>
        </AppSurfaceCard>
    );
};

export default SubscriptionDeleteCard;
