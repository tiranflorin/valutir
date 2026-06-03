import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppThemeProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RequestPasswordResetPage from './pages/auth/RequestPasswordResetPage';
import NewPasswordPage from './pages/auth/NewPasswordPage';
import MySubscriptionsPage from './pages/MySubscriptionsPage';
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
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <AppThemeProvider>
            <BrowserRouter>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </BrowserRouter>
        </AppThemeProvider>
    );
};

export default App;
