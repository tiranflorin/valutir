/**
 * The Personal or Business view the user last picked, shared by the dashboard, Insights, the review
 * and the add forms. Kept in localStorage (strictly necessary; listed in the Privacy Policy). Reads
 * fall back to Personal when storage is blocked or there is no browser (prerendering).
 */
export type DashboardView = 'personal' | 'business';

export const DASHBOARD_VIEW_KEY = 'valutir_dashboard_view';

export const readDashboardView = (): DashboardView => {
    if (typeof window === 'undefined') return 'personal';
    try {
        return window.localStorage.getItem(DASHBOARD_VIEW_KEY) === 'business' ? 'business' : 'personal';
    } catch {
        return 'personal';
    }
};

export const saveDashboardView = (view: DashboardView): void => {
    try {
        window.localStorage.setItem(DASHBOARD_VIEW_KEY, view);
    } catch {
        // Storage blocked: the choice just isn't remembered.
    }
};
