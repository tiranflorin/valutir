import React from 'react';
import { Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import ServiceIcon from '../ServiceIcon';
import { type RecentPriceChange, differenceLabel, priceLabel } from '../../utils/priceHistory';

type Props = {
    changes: RecentPriceChange[];
    currency: string;
};

const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00`));

/**
 * Insights: the price changes made in the last 12 months and what they add to a year together.
 * Built only from changes the user made themselves; shown only when there is one.
 */
const PriceChangesCard: React.FC<Props> = ({ changes, currency }) => {
    const total = changes.reduce((sum, item) => sum + item.yearly, 0);

    return (
        <Paper className="dashboard-list insights-section" component="section" aria-labelledby="insights-price-changes">
            <div className="list-head">
                <h2 id="insights-price-changes">Price changes</h2>
                <span className="list-count" data-testid="insights-price-changes-total">
                    Last 12 months · {Math.abs(total) < 0.005 ? 'no difference in total' : `${differenceLabel(total, currency)} in total`}
                </span>
            </div>
            <ul className="price-history-list">
                {changes.map(({ subscription, change, yearly }) => (
                    <li key={change.id}>
                        <div>
                            <strong><RouterLink className="service-with-icon" to={`/subscriptions/${subscription.id}`}><ServiceIcon serviceName={subscription.serviceName} size="sm" />{subscription.serviceName}</RouterLink></strong>
                            <small>
                                {priceLabel(change.previousAmount, change.previousCurrency, change.previousCadence)}
                                {' → '}
                                {priceLabel(change.newAmount, change.newCurrency, change.newCadence)}
                                {` · changed on ${dayLabel(change.changedOn)}`}
                            </small>
                        </div>
                        {Math.abs(yearly) >= 0.005 && (
                            <span className={`price-history-difference${yearly > 0 ? ' up' : ' down'}`}>{differenceLabel(yearly, currency)}</span>
                        )}
                    </li>
                ))}
            </ul>
        </Paper>
    );
};

export default PriceChangesCard;

