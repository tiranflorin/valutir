import React, { useMemo, useState } from 'react';
import { API_URL } from '../../config';
import { isBeforeToday } from '../../utils/dates';
import { householdPayload } from '../../utils/householdShare';
import { manageUrlError } from '../../utils/manageUrl';
import SubscriptionFormCard, {
    type BillingInterval,
    type SubscriptionFormValues,
    type SubscriptionStatus,
} from '../subscription-form/SubscriptionFormCard';
import type { Currency } from '../CurrencySelect';
import type { SubscriptionCardModel } from './SubscriptionHeaderCard';

type Props = {
    subscription: SubscriptionCardModel;
    token: string;
    onUnauthorized: () => void;
    onSaved: (subscription: SubscriptionCardModel) => void;
    onCancel: () => void;
};

const mapStatusToForm = (status?: string): SubscriptionStatus => {
    if (status === 'trial') return 'Trial';
    if (status === 'paused') return 'Paused';
    return 'Active';
};

const mapStatusToPayload = (status: SubscriptionStatus) => {
    if (status === 'Trial') return 'trial';
    if (status === 'Paused') return 'paused';
    return 'active';
};

const EDIT_STATUS_OPTIONS: SubscriptionStatus[] = ['Active', 'Trial', 'Paused'];

const SubscriptionEditCard: React.FC<Props> = ({
                                                   subscription,
                                                   token,
                                                   onUnauthorized,
                                                   onSaved,
                                                   onCancel,
                                               }) => {
    const [values, setValues] = useState<SubscriptionFormValues>({
        serviceName: subscription.serviceName,
        amount: String(subscription.amount),
        currency: subscription.currency as Currency,
        billingInterval: subscription.billingCadence as BillingInterval,
        renewalDate: subscription.nextBillingDate ?? '',
        category: subscription.category ?? 'Other',
        status: mapStatusToForm(subscription.status),
        resumesOn: subscription.resumesOn ?? '',
        notes: subscription.notes ?? '',
        manageUrl: subscription.manageUrl ?? '',
        providerGroup: '',
        householdShared: subscription.householdShared ?? false,
        householdSize: subscription.householdSize ?? 2,
        autoRenew: subscription.autoRenew,
        b2b: subscription.b2b || window.localStorage.getItem('valutir_dashboard_view') === 'business',
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Cancelled is changed only through the cancel and re-enable cards: editing keeps it as it is.
    const isCancelled = subscription.status === 'cancelled';
    const statusPayload = useMemo(
        () => (isCancelled ? 'cancelled' : mapStatusToPayload(values.status)),
        [isCancelled, values.status]
    );

    const isTrial = !isCancelled && values.status === 'Trial';
    const isPaused = !isCancelled && values.status === 'Paused';

    const handleSave = async () => {
        if (!values.serviceName.trim()) {
            setError('Service name is required.');
            return;
        }

        if (!values.amount || Number(values.amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        // A paused or cancelled subscription may keep a past date; it moves on when charging resumes.
        if (!isPaused && !isCancelled && values.renewalDate && isBeforeToday(values.renewalDate)) {
            setError(`${isTrial ? 'First charge date' : 'Next billing date'} can't be in the past.`);
            return;
        }

        const linkError = manageUrlError(values.manageUrl);
        if (linkError) {
            setError(`Manage or cancel link: ${linkError}`);
            return;
        }

        try {
            setSaving(true);
            setError('');

            const cancelledAt = isCancelled ? subscription.cancelledAt : null;
            const autoRenew = isCancelled ? subscription.autoRenew : values.autoRenew;
            const resumesOn = isPaused ? values.resumesOn || null : null;

            const response = await fetch(`${API_URL}/api/subs/${subscription.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    serviceName: values.serviceName.trim(),
                    category: values.category,
                    amount: Number(values.amount),
                    currency: values.currency,
                    billingCadence: values.billingInterval,
                    nextBillingDate: values.renewalDate || null,
                    // Not on this form, but updates replace every field: send them back unchanged.
                    startedAt: subscription.startedAt ?? null,
                    paymentMethod: subscription.paymentMethod ?? null,
                    trialEndsAt: isTrial ? values.renewalDate || null : null,
                    notes: values.notes.trim() || null,
                    manageUrl: values.manageUrl.trim() || null,
                    status: statusPayload,
                    autoRenew,
                    b2b: values.b2b,
                    ...householdPayload(values),
                    cancelledAt,
                    resumesOn,
                }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                onUnauthorized();
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to update subscription.');
            }

            onSaved(
                data ?? {
                    ...subscription,
                    serviceName: values.serviceName.trim(),
                    category: values.category,
                    amount: Number(values.amount),
                    currency: values.currency,
                    billingCadence: values.billingInterval,
                    nextBillingDate: values.renewalDate || null,
                    notes: values.notes.trim() || null,
                    manageUrl: values.manageUrl.trim() || null,
                    status: statusPayload,
                    autoRenew,
                    b2b: values.b2b,
                    ...householdPayload(values),
                    cancelledAt,
                    resumesOn,
                }
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SubscriptionFormCard
            title="Edit subscription"
            description="Update the current subscription details and save the changes back to your account."
            values={values}
            onChange={setValues}
            error={error}
            submitting={saving}
            submitLabel="Save changes"
            onSubmit={() => {
                void handleSave();
            }}
            onCancel={onCancel}
            showHeader={false}
            showProviderGroup={false}
            showHouseholdShared
            statusOptions={isCancelled ? [] : EDIT_STATUS_OPTIONS}
        />
    );
};

export default SubscriptionEditCard;
