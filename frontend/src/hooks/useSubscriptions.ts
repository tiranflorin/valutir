import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import type { SubscriptionRecord } from '../types/subscription';

type SubscriptionsState = {
    subscriptions: SubscriptionRecord[];
    loading: boolean;
    error: string | null;
};

const NOT_SIGNED_IN: SubscriptionsState = { subscriptions: [], loading: false, error: 'You are not authenticated.' };

/** The signed-in user's subscriptions from `GET /api/subs`; signs out and goes to /login on a 401. */
export const useSubscriptions = (): SubscriptionsState => {
    const navigate = useNavigate();
    const { token, logout } = useAuth();
    const [state, setState] = useState<SubscriptionsState>({ subscriptions: [], loading: true, error: null });

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        const load = async () => {
            try {
                const response = await fetch(`${API_URL}/api/subs`, {
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                });
                const data = await response.json().catch(() => null);
                if (cancelled) return;
                if (response.status === 401) {
                    logout();
                    navigate('/login', { replace: true });
                    return;
                }
                if (!response.ok) throw new Error(data?.message || 'Failed to load subscriptions.');
                setState({ subscriptions: Array.isArray(data) ? data : [], loading: false, error: null });
            } catch (err) {
                if (!cancelled) {
                    setState({ subscriptions: [], loading: false, error: err instanceof Error ? err.message : 'Something went wrong.' });
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [token, logout, navigate]);

    // ProtectedRoute normally keeps signed-out users away; this covers a token cleared mid-session.
    return token ? state : NOT_SIGNED_IN;
};
