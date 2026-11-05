import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppThemeProvider } from '../context/ThemeContext';
import RegisterPage from '../pages/auth/RegisterPage';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const renderRegister = () => (
    <AppThemeProvider>
        <MemoryRouter initialEntries={['/register']}>
            <Routes>
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/my-subs" element={<div>Dashboard</div>} />
            </Routes>
        </MemoryRouter>
    </AppThemeProvider>
);

describe('RegisterPage redirect', () => {
    it('redirects to the dashboard when the user becomes signed in while the page is open', () => {
        // Calling hooks after the early redirect made React throw "Rendered fewer hooks than expected" here.
        mockUseAuth.mockReturnValue({ isAuthenticated: false });
        const { rerender } = render(renderRegister());
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();

        mockUseAuth.mockReturnValue({ isAuthenticated: true });
        rerender(renderRegister());

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
});
