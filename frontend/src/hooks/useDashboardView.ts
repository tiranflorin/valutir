import { useEffect, useState } from 'react';
import type { SubscriptionRecord } from '../types/subscription';
import { type DashboardView, readDashboardView, saveDashboardView } from '../utils/dashboardView';

type DashboardViewState = {
    view: DashboardView;
    selectView: (view: DashboardView) => void;
    /** The Personal/Business switch is offered once the account has a business subscription. */
    hasBusiness: boolean;
};

/**
 * The Personal or Business view for a list of the user's subscriptions. Until the account has a
 * business subscription (cancelled ones count) everything is Personal, and a Business choice saved
 * earlier is reset, so the add forms don't default to business either. `loaded` is false while the
 * list is loading or failed to load, so an empty list then doesn't reset anything.
 */
export const useDashboardView = (subscriptions: SubscriptionRecord[], loaded: boolean): DashboardViewState => {
    const [picked, setPicked] = useState<DashboardView>(readDashboardView);
    const hasBusiness = subscriptions.some((subscription) => subscription.b2b === true);
    const resetPick = loaded && !hasBusiness && picked === 'business';

    useEffect(() => {
        if (resetPick) saveDashboardView('personal');
    }, [resetPick]);

    const selectView = (view: DashboardView) => {
        setPicked(view);
        saveDashboardView(view);
    };

    return { view: resetPick ? 'personal' : picked, selectView, hasBusiness };
};
