export type BackendSubscriptionStatus =
    | 'active'
    | 'trial'
    | 'paused'
    | 'cancelled';

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
    b2b: boolean;
    householdShared: boolean;
    /** People splitting the bill equally, the owner included; null when not shared. */
    householdSize: number | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
    trialEndsAt: string | null;
    trialReminderSentAt: string | null;
    /** Paused only: when it becomes active again; null = paused until changed. */
    resumesOn: string | null;
    /** Flagged by the owner to decide on later; a flag, not a status (still charged and reminded). */
    reviewFlagged: boolean;
    reviewFlaggedAt: string | null;
    reviewNote: string | null;
}
