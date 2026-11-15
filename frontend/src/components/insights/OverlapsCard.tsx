import React from 'react';
import { Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { GROUP_LABELS, type Overlap, joinNames } from '../../utils/overlaps';
import type { ChargeSource } from '../../utils/monthCharges';

type Props = {
    overlaps: Overlap[];
    /** Formats an amount in the page's currency. */
    money: (amount: number) => string;
};

const namesDiffer = (subscriptions: ChargeSource[]) =>
    new Set(subscriptions.map((subscription) => subscription.serviceName.trim().toLowerCase())).size > 1;

const Names: React.FC<{ subscriptions: ChargeSource[] }> = ({ subscriptions }) => (
    <>
        {subscriptions.map((subscription, index) => (
            <React.Fragment key={subscription.id}>
                {index > 0 && (index === subscriptions.length - 1 ? ' and ' : ', ')}
                <RouterLink to={`/subscriptions/${subscription.id}`}>{subscription.serviceName}</RouterLink>
            </React.Fragment>
        ))}
    </>
);

/**
 * Insights: subscriptions that may pay for the same thing twice (utils/overlaps.ts). Written as
 * something to check, never as a promised saving: two music services can be a deliberate choice.
 */
const OverlapsCard: React.FC<Props> = ({ overlaps, money }) => overlaps.length === 0 ? (
    // Says the check ran, so an empty result reads as good news rather than a missing feature.
    <Paper className="dashboard-list insights-section overlaps-card overlaps-card--clear" component="section" aria-labelledby="insights-overlaps">
        <h2 id="insights-overlaps">Worth a look</h2>
        <p>
            Nothing you pay for twice: no duplicates, bundles that include another subscription, or two services for the same job
            among these subscriptions.
        </p>
    </Paper>
) : (
    <Paper className="dashboard-list insights-section overlaps-card" component="section" aria-labelledby="insights-overlaps">
        <div className="list-head">
            <h2 id="insights-overlaps">Worth a look</h2>
            <span className="list-count">Subscriptions that may pay for the same thing twice</span>
        </div>
        <ul className="overlap-list">
            {overlaps.map((overlap) => {
                if (overlap.kind === 'duplicate') {
                    const extra = overlap.subscriptions.length - 1;
                    return (
                        <li key={`duplicate-${overlap.name}`}>
                            <strong>{overlap.name} is listed {overlap.subscriptions.length} times</strong>
                            <p>
                                If they aren’t separate accounts on purpose, the extra {extra === 1 ? 'one costs' : `${extra} cost`}{' '}
                                <b>{money(overlap.extraYearly)} a year</b>. Open them:{' '}
                                {overlap.subscriptions.map((subscription, index) => (
                                    <React.Fragment key={subscription.id}>
                                        {index > 0 && ' · '}
                                        {/* The same name twice says nothing: each link shows what that copy costs, and its
                                            own name when they differ ("Spotify Family"). */}
                                        <RouterLink to={`/subscriptions/${subscription.id}`}>
                                            {namesDiffer(overlap.subscriptions) && `${subscription.serviceName.trim()}, `}
                                            {money(Number(subscription.amount) || 0)} {subscription.billingCadence.toLowerCase()}
                                        </RouterLink>
                                    </React.Fragment>
                                ))}
                            </p>
                        </li>
                    );
                }
                if (overlap.kind === 'bundle') {
                    const bundle = overlap.bundle.serviceName;
                    return (
                        <li key={`bundle-${overlap.bundle.id}`}>
                            <strong>{bundle} already includes {joinNames(overlap.included.map((item) => item.serviceName))}</strong>
                            <p>
                                You also pay for <Names subscriptions={overlap.included} /> separately: <b>{money(overlap.includedYearly)} a year</b>.
                                {' '}Unless you need more than <RouterLink to={`/subscriptions/${overlap.bundle.id}`}>{bundle}</RouterLink> gives you, that’s paying twice.
                            </p>
                        </li>
                    );
                }
                return (
                    <li key={`group-${overlap.group}`}>
                        <strong>{overlap.subscriptions.length} {GROUP_LABELS[overlap.group].plural}</strong>
                        <p>
                            <Names subscriptions={overlap.subscriptions} /> together cost <b>{money(overlap.totalYearly)} a year</b>.
                            {' '}If one would do the job, the others are worth a look.
                        </p>
                    </li>
                );
            })}
        </ul>
        <p className="overlap-review">
            <RouterLink to="/review">Go through them in a review →</RouterLink> They come right after trials ending soon and anything you flagged.
        </p>
    </Paper>
);

export default OverlapsCard;
