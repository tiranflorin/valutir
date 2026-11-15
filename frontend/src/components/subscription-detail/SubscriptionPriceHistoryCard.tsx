import React, { useState } from 'react';
import { Alert, Button, Paper } from '@mui/material';
import { API_URL } from '../../config';
import type { SubscriptionCardModel } from '../../types/subscription';
import { differenceLabel, priceLabel, yearlyDifference } from '../../utils/priceHistory';

type Props = {
    subscription: SubscriptionCardModel;
    token: string;
    onUnauthorized: () => void;
    onUpdated: (subscription: SubscriptionCardModel) => void;
};

const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00`));

/**
 * Every change the owner made to what this subscription costs, newest first, with what it adds to a
 * year. Hidden until there is one. A change that was only a typo fix can be removed.
 */
const SubscriptionPriceHistoryCard: React.FC<Props> = ({ subscription, token, onUnauthorized, onUpdated }) => {
    const [removing, setRemoving] = useState<number | null>(null);
    const [error, setError] = useState('');
    const changes = subscription.priceChanges ?? [];
    if (changes.length === 0) return null;

    const remove = async (changeId: number) => {
        setError('');
        setRemoving(changeId);
        try {
            const response = await fetch(`${API_URL}/api/subs/${subscription.id}/price-changes/${changeId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json().catch(() => null);
            if (response.status === 401) {
                onUnauthorized();
                return;
            }
            if (!response.ok) throw new Error(data?.message || 'Could not remove it from the history.');
            onUpdated(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setRemoving(null);
        }
    };

    return (
        <Paper className="subscription-info-panel price-history-card" component="section" aria-labelledby="price-history-title">
            <div className="subscription-info-heading">
                <h2 id="price-history-title">Price history</h2>
                <p>Each time you changed what it costs</p>
            </div>
            <ul className="price-history-list">
                {changes.map((change) => {
                    const difference = yearlyDifference(change);
                    return (
                        <li key={change.id}>
                            <div>
                                <strong>
                                    {priceLabel(change.previousAmount, change.previousCurrency, change.previousCadence)}
                                    {' → '}
                                    {priceLabel(change.newAmount, change.newCurrency, change.newCadence)}
                                </strong>
                                <small>Changed on {dayLabel(change.changedOn)}</small>
                            </div>
                            {difference !== null && Math.abs(difference) >= 0.005 && (
                                <span className={`price-history-difference${difference > 0 ? ' up' : ' down'}`}>
                                    {differenceLabel(difference, change.newCurrency)}
                                </span>
                            )}
                            <Button
                                size="small"
                                variant="text"
                                disabled={removing !== null}
                                onClick={() => remove(change.id)}
                                aria-label={`Remove the change on ${dayLabel(change.changedOn)} from the history`}
                            >
                                Remove
                            </Button>
                        </li>
                    );
                })}
            </ul>
            <p className="price-history-note">Was it a typo fix rather than a new price? Remove it, and it won’t count.</p>
            {error && <Alert severity="error">{error}</Alert>}
        </Paper>
    );
};

export default SubscriptionPriceHistoryCard;
