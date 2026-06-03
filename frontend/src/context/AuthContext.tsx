import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, loginRequest, parseJwt } from '../services/auth';

type AuthContextValue = {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'valutir_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = window.localStorage.getItem(STORAGE_KEY);

        if (storedToken) {
            const parsedUser = parseJwt(storedToken);

            if (parsedUser) {
                setToken(storedToken);
                setUser(parsedUser);
            } else {
                window.localStorage.removeItem(STORAGE_KEY);
            }
        }

        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const result = await loginRequest({ email, password });
        const parsedUser = parseJwt(result.token);

        window.localStorage.setItem(STORAGE_KEY, result.token);
        setToken(result.token);
        setUser(parsedUser);
    };

    const logout = () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
    };

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated: !!token,
            loading,
            login,
            logout,
        }),
        [user, token, loading]
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
