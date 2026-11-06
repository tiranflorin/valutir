import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import ProfilePage from '../pages/ProfilePage';
import PreferencesPage from '../pages/PreferencesPage';
import ConfirmEmailPage from '../pages/auth/ConfirmEmailPage';
import AppHeader from '../components/AppHeader';
import { STORAGE_KEY, authHeader, bodyOf, fakeJwt, mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const accountProfile = profile({ name: 'Ada Lovelace', defaultCurrency: 'RON' });

describe('account management', () => {
    beforeEach(() => {
        signIn();
    });

    it('loads the real profile instead of guessing the name from the email', async () => {
        mockApi({ 'GET /api/profile': () => ({ status: 200, body: accountProfile }) });
        renderWithMemoryRoute(<ProfilePage />, { route: '/profile' });

        expect(await screen.findByDisplayValue('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    });

    it('clears the session when the token has been revoked', async () => {
        mockApi({ 'GET /api/profile': () => ({ status: 401, body: { message: 'Invalid JWT Token' } }) });
        renderWithMemoryRoute(<ProfilePage />, { route: '/profile' });

        await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull());
    });

    it('revokes the token on the server when logging out', async () => {
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: accountProfile }),
            'POST /api/logout': () => ({ status: 204 }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(<AppHeader />, { route: '/my-subs' });

        await user.click(await screen.findByRole('button', { name: /open account menu/i }));
        await user.click(screen.getByRole('menuitem', { name: /log out/i }));

        await waitFor(() => expect(calls.some((call) => call.key === 'POST /api/logout')).toBe(true));
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('saves the default currency to the account', async () => {
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: accountProfile }),
            'PATCH /api/profile': (call) => ({ status: 200, body: { ...accountProfile, ...bodyOf(call) } }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(<PreferencesPage />, { route: '/preferences' });

        // The saved account currency is shown once the profile loads.
        expect(await screen.findByText('RON · Romanian Leu (lei)', { selector: 'strong' })).toBeInTheDocument();
        await user.click(screen.getByRole('combobox', { name: /default currency/i }));
        await user.click(screen.getByRole('option', { name: /USD/i }));
        await user.click(screen.getByRole('button', { name: /save preference/i }));

        expect(await screen.findByText(/saved to your account/i)).toBeInTheDocument();
        expect(bodyOf(calls.find((call) => call.key === 'PATCH /api/profile')!)).toEqual({ defaultCurrency: 'USD' });
    });

    it('keeps this device signed in with the new token after a password change', async () => {
        const newToken = fakeJwt('ada@example.test', 2);
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: accountProfile }),
            'PATCH /api/profile/password': () => ({ status: 200, body: { message: 'Password updated. Other devices have been signed out.', token: newToken } }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(<ProfilePage />, { route: '/profile' });

        const passwordCard = (await screen.findByRole('heading', { name: 'Password' })).closest('form')!;
        const fields = passwordCard.querySelectorAll('input');
        await user.type(fields[0], 'Str0ng-pass');
        await user.type(fields[1], 'Newer-pass1');
        await user.type(fields[2], 'Newer-pass1');
        await user.click(screen.getByRole('button', { name: /update password/i }));

        expect(await screen.findByText(/other devices have been signed out/i)).toBeInTheDocument();
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(newToken);
    });

    it('requires the password and an explicit confirmation before deleting the account', async () => {
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: accountProfile }),
            'DELETE /api/profile': () => ({ status: 204 }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(
            <Routes>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/" element={<div>Home page</div>} />
            </Routes>,
            { route: '/profile' },
        );

        const deleteButton = await screen.findByRole('button', { name: /delete my account/i });
        const deleteForm = deleteButton.closest('form')!;
        await user.type(deleteForm.querySelector('input[type="password"]')!, 'Str0ng-pass');
        expect(deleteButton).toBeDisabled();

        await user.click(screen.getByRole('checkbox', { name: /permanently deleted/i }));
        await user.click(deleteButton);

        expect(await screen.findByText('Home page')).toBeInTheDocument();
        const deleteCall = calls.find((call) => call.key === 'DELETE /api/profile')!;
        expect(bodyOf(deleteCall)).toEqual({ currentPassword: 'Str0ng-pass' });
        expect(authHeader(deleteCall)).toMatch(/^Bearer /);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('confirms an email change from the emailed link and ends the old session', async () => {
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: accountProfile }),
            'POST /api/profile/email/confirm': () => ({ status: 200, body: { message: 'Your email address has been updated. Sign in with your new address.' } }),
        });
        const token = 'a'.repeat(64);
        renderWithMemoryRoute(<ConfirmEmailPage />, { route: `/confirm-email?token=${token}` });

        expect(await screen.findByRole('heading', { name: /email updated/i })).toBeInTheDocument();
        const confirmCalls = calls.filter((call) => call.key === 'POST /api/profile/email/confirm');
        expect(confirmCalls).toHaveLength(1);
        expect(bodyOf(confirmCalls[0])).toEqual({ token });
        expect(authHeader(confirmCalls[0])).toBeUndefined();
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});
