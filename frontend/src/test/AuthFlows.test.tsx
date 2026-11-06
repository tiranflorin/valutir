import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../App';
import { STORAGE_KEY, bodyOf, callsTo, fakeJwt, mockApi, profile } from './api';

/** The whole app (real routes, providers, and route guards) starting at the given URL. */
const renderApp = (route: string) => render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);

const signInWith = async (email: string, password: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email address/i), email);
    await user.type(screen.getByLabelText(/^password/i), password);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('signing in', () => {
    it('sends a visitor to sign in, then back to the page they asked for', async () => {
        const token = fakeJwt();
        const calls = mockApi({
            'POST /api/login_check': () => ({ status: 200, body: { token } }),
            'GET /api/profile': () => ({ status: 200, body: profile() }),
        });
        renderApp('/subscriptions/new');

        expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
        await signInWith('ada@example.test', 'Str0ng-pass');

        expect(await screen.findByRole('heading', { name: /add a subscription/i })).toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'POST /api/login_check')[0])).toEqual({ email: 'ada@example.test', password: 'Str0ng-pass' });
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(token);
    });

    it('shows the error and stays signed out when the credentials are wrong', async () => {
        mockApi({ 'POST /api/login_check': () => ({ status: 401, body: { message: 'Invalid credentials.' } }) });
        renderApp('/my-subs');

        await signInWith('ada@example.test', 'wrong-pass');

        expect(await screen.findByText('Invalid credentials.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});

describe('resetting a forgotten password', () => {
    it('emails a reset link', async () => {
        const calls = mockApi({ 'POST /api/reset-password/request': () => ({ status: 202, body: { message: 'Check your inbox.' } }) });
        const user = userEvent.setup();
        renderApp('/request-password-reset');

        await user.type(screen.getByLabelText(/email address/i), 'ada@example.test');
        await user.click(screen.getByRole('button', { name: 'Send reset link' }));

        expect(await screen.findByText(/reset instructions have been sent to ada@example.test/i)).toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'POST /api/reset-password/request')[0])).toEqual({ email: 'ada@example.test' });
    });

    it('sets a new password from the emailed link', async () => {
        const token = 'a'.repeat(64);
        const calls = mockApi({ 'POST /api/reset-password/new': () => ({ status: 200, body: { message: 'Password updated.' } }) });
        const user = userEvent.setup();
        renderApp(`/reset-password?token=${token}`);

        await user.type(screen.getByLabelText(/^new password/i), 'Newer-pass1');
        await user.type(screen.getByLabelText(/^confirm new password/i), 'Newer-pass1');
        await user.click(screen.getByRole('button', { name: 'Save new password' }));

        expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'POST /api/reset-password/new')[0])).toEqual({ token, newPassword: 'Newer-pass1' });
    });
});
