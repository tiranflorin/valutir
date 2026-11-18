import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchBillingStatus } from '../services/account';

/**
 * Whether the signed-in account has every paid feature (the unlock, or an admin account); null while
 * loading or when it couldn't be loaded. The server checks it again on every request that needs it.
 */
export function usePaidFeatures(): boolean | null {
    const { token } = useAuth();
    const [paidFeatures, setPaidFeatures] = useState<boolean | null>(null);

    useEffect(() => {
        if (!token) return undefined;
        let active = true;
        fetchBillingStatus(token)
            .then((status) => active && setPaidFeatures(status.paidFeatures))
            .catch(() => active && setPaidFeatures(null));
        return () => {
            active = false;
        };
    }, [token]);

    return token ? paidFeatures : null;
}
