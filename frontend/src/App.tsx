import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RequestPasswordResetPage from './pages/auth/RequestPasswordResetPage';
import NewPasswordPage from './pages/auth/NewPasswordPage';

const App: React.FC = () => {
    return (
        <AppThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
                    <Route path="/reset-password" element={<NewPasswordPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </AppThemeProvider>
    );
};

export default App;
