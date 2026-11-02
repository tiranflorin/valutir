import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, parseJwt, type AuthUser } from '../services/auth';
import { ApiError, fetchProfile, logoutRequest, type AccountProfile } from '../services/account';

type AuthContextValue = {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    /** Revokes the current token on the server (best effort) and clears the local session. */
    logout: () => void;
    /** Clears the local session only, e.g. after the server already invalidated the token. */
    clearSession: () => void;
    /** Stores a freshly issued token, e.g. after a password change signed out other devices. */
    replaceToken: (token: string) => void;
    /** Applies profile data returned by the API. */
    applyProfile: (profile: AccountProfile) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'valutir_auth_token';

const mergeProfile = (user: AuthUser | null, profile: AccountProfile): AuthUser => ({
    ...user,
    email: profile.email,
    name: profile.name ?? user?.name,
    defaultCurrency: profile.defaultCurrency,
    timezone: profile.timezone,
    remindersEnabled: profile.remindersEnabled,
    pendingEmail: profile.pendingEmail,
});

/** The session saved in this browser, if its token is still readable. A broken token is discarded. */
const readStoredSession = (): { token: string; user: AuthUser } | null => {
    const storedToken = window.localStorage.getItem(STORAGE_KEY);
    if (!storedToken) {
        return null;
    }
    const storedUser = parseJwt(storedToken);
    if (!storedUser) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    }

    return { token: storedToken, user: storedUser };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Read once on mount, so the session is known from the first render (no loading phase).
    const [storedSession] = useState(readStoredSession);
    const [token, setToken] = useState<string | null>(storedSession?.token ?? null);
    const [user, setUser] = useState<AuthUser | null>(storedSession?.user ?? null);

    const clearSession = useCallback(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
    }, []);

    const startSession = useCallback((newToken: string) => {
        const parsedUser = parseJwt(newToken);
        if (!parsedUser) {
            clearSession();
            return false;
        }
        window.localStorage.setItem(STORAGE_KEY, newToken);
        setToken(newToken);
        setUser((current) => (current && current.email === parsedUser.email ? { ...parsedUser, ...current } : parsedUser));

        return true;
    }, [clearSession]);

    // Load the real account details (name, currency, pending email) for the current token.
    useEffect(() => {
        if (!token) {
            return;
        }
        let cancelled = false;
        fetchProfile(token)
            .then((profile) => {
                if (!cancelled) {
                    setUser((current) => mergeProfile(current, profile));
                }
            })
            .catch((error: unknown) => {
                // A revoked or expired token: the session is over.
                if (!cancelled && error instanceof ApiError && error.status === 401) {
                    clearSession();
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token, clearSession]);

    const login = useCallback(async (email: string, password: string) => {
        const result = await loginRequest({ email, password });
        startSession(result.token);
    }, [startSession]);

    const logout = useCallback(() => {
        if (token) {
            // Fire and forget: the local session ends either way.
            void logoutRequest(token).catch(() => undefined);
        }
        clearSession();
    }, [token, clearSession]);

    const replaceToken = useCallback((newToken: string) => {
        startSession(newToken);
    }, [startSession]);

    const applyProfile = useCallback((profile: AccountProfile) => {
        setUser((current) => mergeProfile(current, profile));
    }, []);

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated: !!token,
            login,
            logout,
            clearSession,
            replaceToken,
            applyProfile,
        }),
        [user, token, login, logout, clearSession, replaceToken, applyProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}
