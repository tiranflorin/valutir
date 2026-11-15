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

/** One change the owner made to what a subscription costs; recorded by the server when an edit changes it. */
export interface PriceChange {
    id: number;
    previousAmount: string;
    previousCurrency: string;
    previousCadence: string;
    newAmount: string;
    newCurrency: string;
    newCadence: string;
    /** YYYY-MM-DD, the owner's local day. */
    changedOn: string;
}

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
    /** The provider's page to manage or cancel it (https); null when not set. */
    manageUrl: string | null;
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
    /** Newest first. */
    priceChanges: PriceChange[];
}

/** A subscription as the detail page and its cards use it: the amount as a number. */
export type SubscriptionCardModel = {
    id: number;
    serviceName: string;
    category: string | null;
    amount: number;
    currency: string;
    billingCadence: string;
    nextBillingDate: string | null;
    notes: string | null;
    status: string;
    autoRenew: boolean;
    b2b: boolean;
    householdShared?: boolean;
    householdSize?: number | null;
    cancelledAt: string | null;
    startedAt?: string | null;
    paymentMethod?: string | null;
    manageUrl?: string | null;
    trialEndsAt?: string | null;
    trialReminderSentAt?: string | null;
    resumesOn?: string | null;
    reviewFlagged?: boolean;
    reviewFlaggedAt?: string | null;
    reviewNote?: string | null;
    priceChanges?: PriceChange[];
};
