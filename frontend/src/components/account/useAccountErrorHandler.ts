import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/account';

/**
 * Turns an API failure into a message to show. A 401 means the token was revoked or expired,
 * so the local session is cleared and the user is sent to sign in.
 */
export function useAccountErrorHandler() {
    const { clearSession } = useAuth();
    const navigate = useNavigate();

    return useCallback((error: unknown): string | null => {
        if (error instanceof ApiError && error.status === 401) {
            clearSession();
            navigate('/login', { replace: true });
            return null;
        }

        return error instanceof Error ? error.message : 'Something went wrong.';
    }, [clearSession, navigate]);
}
