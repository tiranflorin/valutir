import React from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppThemeProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RequestPasswordResetPage from './pages/auth/RequestPasswordResetPage';
import NewPasswordPage from './pages/auth/NewPasswordPage';
import ConfirmEmailPage from './pages/auth/ConfirmEmailPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import UnsubscribePage from './pages/auth/UnsubscribePage';
import MySubscriptionsPage from './pages/MySubscriptionsPage';
import SubscriptionDetailPage from './pages/SubscriptionDetailPage';
import AddSubscriptionPage from './pages/AddSubscriptionPage';
import CalendarPage from './pages/CalendarPage';
import CalendarDayPage from './pages/CalendarDayPage';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import PreferencesPage from './pages/PreferencesPage';
import PlansPage from './pages/PlansPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import RefundPage from './pages/RefundPage';
import ProtectedRoute from './components/ProtectedRoute';

const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const newPasswordPage = isAuthenticated ? <Navigate to="/my-subs" replace /> : <NewPasswordPage />;

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/refunds" element={<RefundPage />} />

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
                element={newPasswordPage}
            />

            <Route
                path="/reset-password"
                element={newPasswordPage}
            />

            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />

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

            <Route
                path="/insights"
                element={
                    <ProtectedRoute>
                        <InsightsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/calendar/day/:date"
                element={
                    <ProtectedRoute>
                        <CalendarDayPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/preferences"
                element={
                    <ProtectedRoute>
                        <PreferencesPage />
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
