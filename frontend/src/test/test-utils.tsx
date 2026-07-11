import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

type RenderWithRouteOptions = RenderOptions & {
    route?: string;
};

export function renderWithMemoryRoute(
    ui: React.ReactElement,
    { route = '/', ...options }: RenderWithRouteOptions = {}
) {
    return render(
        <AppThemeProvider>
            <AuthProvider>
                <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
            </AuthProvider>
        </AppThemeProvider>,
        options
    );
}
