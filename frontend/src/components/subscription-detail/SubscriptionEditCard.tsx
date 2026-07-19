import React, { useMemo, useState } from 'react';
import { VITE_API_URL } from '../../services/auth';
import SubscriptionFormCard, {
    type BillingInterval,
    type SubscriptionFormValues,
    type SubscriptionStatus,
} from '../subscription-form/SubscriptionFormCard';
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
    if (status === 'other' || status === 'cancelled') return 'Other';
    return 'Active';
};

const mapStatusToPayload = (status: SubscriptionStatus) => {
    if (status === 'Trial') return 'trial';
    if (status === 'Other') return 'other';
    return 'active';
};

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
        currency: subscription.currency,
        billingInterval: subscription.billingCadence as BillingInterval,
        renewalDate: subscription.nextBillingDate ?? '',
        category: subscription.category ?? 'Other',
        status: mapStatusToForm(subscription.status),
        notes: subscription.notes ?? '',
        providerGroup: '',
        householdShared: false,
        autoRenew: subscription.autoRenew,
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const statusPayload = useMemo(
        () => mapStatusToPayload(values.status),
        [values.status]
    );

    const isTrial = values.status === 'Trial';
    const isOther = values.status === 'Other';

    const handleSave = async () => {
        if (!values.serviceName.trim()) {
            setError('Service name is required.');
            return;
        }

        if (!values.amount || Number(values.amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        try {
            setSaving(true);
            setError('');

            const cancelledAt = isOther ? new Date().toISOString().slice(0, 10) : null;

            const response = await fetch(`${VITE_API_URL}/api/subs/${subscription.id}`, {
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
                    trialEndsAt: isTrial ? values.renewalDate || null : null,
                    trialReminderSentAt: null,
                    notes: values.notes.trim() || null,
                    status: statusPayload,
                    autoRenew: !isOther && values.autoRenew,
                    cancelledAt,
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
                    status: statusPayload,
                    autoRenew: !isOther && values.autoRenew,
                    cancelledAt,
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
            showCurrency={false}
            showProviderGroup={false}
            showHouseholdShared={false}
        />
    );
};

export default SubscriptionEditCard;
