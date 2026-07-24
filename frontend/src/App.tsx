import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppThemeProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RequestPasswordResetPage from './pages/auth/RequestPasswordResetPage';
import NewPasswordPage from './pages/auth/NewPasswordPage';
import MySubscriptionsPage from './pages/MySubscriptionsPage';
import SubscriptionDetailPage from './pages/SubscriptionDetailPage';
import AddSubscriptionPage from './pages/AddSubscriptionPage';
import CalendarPage from './pages/CalendarPage';
import ProtectedRoute from './components/ProtectedRoute';

const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />

            <Route
                path="/login"
                element={
                    isAuthenticated ? <Navigate to="/my-subs" replace /> : <LoginPage />
                }
            />

            <Route
                path="/register"
                element={
                    isAuthenticated ? <Navigate to="/my-subs" replace /> : <RegisterPage />
                }
            />

            <Route
                path="/request-password-reset"
                element={
                    isAuthenticated ? (
                        <Navigate to="/my-subs" replace />
                    ) : (
                        <RequestPasswordResetPage />
                    )
                }
            />

            <Route
                path="/new-password"
                element={
                    isAuthenticated ? <Navigate to="/my-subs" replace /> : <NewPasswordPage />
                }
            />

            <Route
                path="/my-subs"
                element={
                    <ProtectedRoute>
                        <MySubscriptionsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/subscriptions/new"
                element={
                    <ProtectedRoute>
                        <AddSubscriptionPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/subscriptions/:subscriptionId"
                element={
                    <ProtectedRoute>
                        <SubscriptionDetailPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="*"
                element={<Navigate to={isAuthenticated ? '/my-subs' : '/'} replace />}
            />

            <Route
                path="/calendar"
                element={
                    <ProtectedRoute>
                        <CalendarPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
};

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <AppThemeProvider>
            <AuthProvider>{children}</AuthProvider>
        </AppThemeProvider>
    );
};

const App: React.FC = () => {
    return (
        <AppProviders>
            <AppRoutes />
        </AppProviders>
    );
};

export default App;
export { AppProviders, AppRoutes };
