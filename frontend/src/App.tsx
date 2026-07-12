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
import ProtectedRoute from './components/ProtectedRoute';

const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
            />
            <Route
                path="/register"
                element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
            />
            <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
            <Route path="/reset-password" element={<NewPasswordPage />} />
            <Route
                path="/my-subs"
                element={
                    <ProtectedRoute>
                        <MySubscriptionsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/my-subs/new"
                element={
                    <ProtectedRoute>
                        <AddSubscriptionPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/my-subs/:subscriptionId"
                element={
                    <ProtectedRoute>
                        <SubscriptionDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route path="/subscriptions/:subscriptionId" element={<SubscriptionDetailPage />} />
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
