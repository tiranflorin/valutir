export type BackendSubscriptionStatus =
    | 'active'
    | 'trial'
    | 'cancelled'
    | 'other';

export type SubscriptionBillingFrequency =
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'yearly';

export interface SubscriptionRecord {
    id: number;
    serviceName: string;
    amount: string;
    currency: string;
    status: BackendSubscriptionStatus;
    billingCadence: SubscriptionBillingFrequency;
    category: string | null;
    startedAt: string | null;
    nextBillingDate: string | null;
    notes: string | null;
    paymentMethod: string | null;
    isActive: boolean;
    autoRenew: boolean;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
    trialEndsAt: string | null;
    trialReminderSentAt: string | null;
}
