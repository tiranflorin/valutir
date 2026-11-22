import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listSubscriptions } from '../services/subscriptions';
import type { SubscriptionRecord } from '../types/subscription';
import { useAccountErrorHandler } from './useAccountErrorHandler';

type SubscriptionsState = {
    subscriptions: SubscriptionRecord[];
    loading: boolean;
    error: string | null;
};

const NOT_SIGNED_IN: SubscriptionsState = { subscriptions: [], loading: false, error: 'You are not authenticated.' };

/**
 * The signed-in user's subscriptions; signs out and goes to /login on a 401. A new `reloadKey`
 * loads the list again (the dashboard passes the calculator's save result).
 */
export const useSubscriptions = (reloadKey?: unknown): SubscriptionsState => {
    const { token } = useAuth();
    const errorMessage = useAccountErrorHandler();
    const [state, setState] = useState<SubscriptionsState>({ subscriptions: [], loading: true, error: null });

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        listSubscriptions(token).then(
            (subscriptions) => {
                if (!cancelled) setState({ subscriptions, loading: false, error: null });
            },
            (error: unknown) => {
                const message = errorMessage(error);
                if (!cancelled && message !== null) setState({ subscriptions: [], loading: false, error: message });
            },
        );
        return () => {
            cancelled = true;
        };
    }, [token, errorMessage, reloadKey]);

    // ProtectedRoute normally keeps signed-out users away; this covers a token cleared mid-session.
    return token ? state : NOT_SIGNED_IN;
};
