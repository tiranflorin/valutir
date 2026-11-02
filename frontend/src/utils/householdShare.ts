/** People a household subscription can be split between, the owner included (the API allows 2-10). */
export const HOUSEHOLD_SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type Shareable = {
    householdShared?: boolean | null;
    householdSize?: number | null;
};

/** How many people split the bill: 1 when the subscription isn't shared. */
export const splitCount = ({ householdShared, householdSize }: Shareable): number =>
    householdShared && householdSize && householdSize >= 2 ? householdSize : 1;

/** The owner's equal share of a bill amount (the full amount when not shared). */
export const shareOf = (amount: number, subscription: Shareable): number => amount / splitCount(subscription);

/** The sharing fields as the API expects them: business subscriptions are never shared. */
export const householdPayload = (values: { householdShared: boolean; householdSize: number; b2b: boolean }) => {
    const shared = values.householdShared && !values.b2b;

    return { householdShared: shared, householdSize: shared ? values.householdSize : null };
};
