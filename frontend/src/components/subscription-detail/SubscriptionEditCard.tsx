import React, { useState } from 'react';
import { usePaidFeatures } from '../../hooks/usePaidFeatures';
import { useAuth } from '../../context/AuthContext';
import { useAccountErrorHandler } from '../../hooks/useAccountErrorHandler';
import { updateSubscription } from '../../services/subscriptions';
import { isBeforeToday } from '../../utils/dates';
import { manageUrlError } from '../../utils/manageUrl';
import SubscriptionFormCard, {
    type BillingInterval,
    type SubscriptionFormValues,
    type SubscriptionStatus,
} from '../subscription-form/SubscriptionFormCard';
import type { Currency } from '../CurrencySelect';
import type { SubscriptionCardModel, SubscriptionRecord } from '../../types/subscription';
import { readDashboardView } from '../../utils/dashboardView';

type Props = {
    subscription: SubscriptionCardModel;
    onSaved: (subscription: SubscriptionRecord) => void;
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
        householdShared: subscription.householdShared ?? false,
        householdSize: subscription.householdSize ?? 2,
        autoRenew: subscription.autoRenew,
        b2b: subscription.b2b || readDashboardView() === 'business',
        paidPersonally: subscription.paidPersonally ?? false,
        reminderLeadDays: subscription.reminderLeadDays ?? null,
    });

    const paidFeatures = usePaidFeatures();
    const { token } = useAuth();
    const errorMessage = useAccountErrorHandler();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isCancelled = subscription.status === 'cancelled';

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

            const saved = await updateSubscription(token, subscription, {
                serviceName: values.serviceName.trim(),
                category: values.category,
                amount: Number(values.amount),
                currency: values.currency,
                billingCadence: values.billingInterval,
                nextBillingDate: values.renewalDate || null,
                trialEndsAt: isTrial ? values.renewalDate || null : null,
                notes: values.notes.trim() || null,
                manageUrl: values.manageUrl.trim() || null,
                // Cancelled is changed only through the cancel and re-enable cards: editing keeps it as it is.
                ...(isCancelled ? {} : { status: mapStatusToPayload(values.status), autoRenew: values.autoRenew, cancelledAt: null }),
                b2b: values.b2b,
                paidPersonally: values.paidPersonally,
                reminderLeadDays: values.reminderLeadDays,
                householdShared: values.householdShared,
                householdSize: values.householdSize,
                resumesOn: values.resumesOn || null,
            });
            onSaved(saved);
        } catch (err) {
            const message = errorMessage(err);
            if (message !== null) setError(message);
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
            priceHelperText="A new price, currency or billing cadence keeps the old one in the price history."
            onSubmit={() => {
                void handleSave();
            }}
            onCancel={onCancel}
            showHeader={false}
            showHouseholdShared
            statusOptions={isCancelled ? [] : EDIT_STATUS_OPTIONS}
            paidFeatures={paidFeatures}
        />
    );
};

export default SubscriptionEditCard;
