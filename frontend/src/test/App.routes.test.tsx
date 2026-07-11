import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../App';
import { renderWithMemoryRoute } from './test-utils';

const mockUseAuth = vi.fn();

vi.mock('../context/AuthContext', async () => {
    const actual = await vi.importActual<typeof import('../context/AuthContext')>(
        '../context/AuthContext'
    );

    return {
        ...actual,
        useAuth: () => mockUseAuth(),
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

describe('App routes', () => {
    beforeEach(() => {
        mockUseAuth.mockReset();
    });

    it('redirects unauthenticated users from /my-subs/new to login', () => {
        mockUseAuth.mockReturnValue({ isAuthenticated: false });

        renderWithMemoryRoute(<App />, { route: '/my-subs/new' });

        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    it('redirects unauthenticated users from /my-subs to login', () => {
        mockUseAuth.mockReturnValue({ isAuthenticated: false });

        renderWithMemoryRoute(<App />, { route: '/my-subs' });

        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    it('renders add subscription page for authenticated users', () => {
        mockUseAuth.mockReturnValue({ isAuthenticated: true });

        renderWithMemoryRoute(<App />, { route: '/my-subs/new' });

        expect(screen.getByText(/add subscription/i)).toBeInTheDocument();
    });

    it('renders subscriptions page for authenticated users', () => {
        mockUseAuth.mockReturnValue({ isAuthenticated: true });

        renderWithMemoryRoute(<App />, { route: '/my-subs' });

        expect(screen.getByRole('heading', { name: /my subs/i })).toBeInTheDocument();
    });
});
