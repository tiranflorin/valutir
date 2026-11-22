import React, { useState } from 'react';
import { Alert, Button, Paper } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useAccountErrorHandler } from '../../hooks/useAccountErrorHandler';
import { removePriceChange } from '../../services/subscriptions';
import type { SubscriptionCardModel, SubscriptionRecord } from '../../types/subscription';
import { differenceLabel, priceLabel, yearlyDifference } from '../../utils/priceHistory';

type Props = {
    subscription: SubscriptionCardModel;
    onUpdated: (subscription: SubscriptionRecord) => void;
};

const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00`));

/**
 * Every change the owner made to what this subscription costs, newest first, with what it adds to a
 * year. Hidden until there is one. A change that was only a typo fix can be removed.
 */
const SubscriptionPriceHistoryCard: React.FC<Props> = ({ subscription, onUpdated }) => {
    const { token } = useAuth();
    const errorMessage = useAccountErrorHandler();
    const [removing, setRemoving] = useState<number | null>(null);
    const [error, setError] = useState('');
    const changes = subscription.priceChanges ?? [];
    if (changes.length === 0) return null;

    const remove = async (changeId: number) => {
        setError('');
        setRemoving(changeId);
        try {
            onUpdated(await removePriceChange(token, subscription.id, changeId));
        } catch (err) {
            const message = errorMessage(err);
            if (message !== null) setError(message);
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
