import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../pages/auth/RegisterPage';
import { renderWithMemoryRoute } from './test-utils';

const fillForm = async (password: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/email address/i), 'ada@example.test');
    await user.type(screen.getByLabelText(/^password$/i), password);
    await user.type(screen.getByLabelText(/confirm password/i), password);
    await user.click(screen.getByRole('button', { name: /create account/i }));
};

describe('RegisterPage password policy', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('rejects a 7-character password even when it has uppercase, number, and symbol', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        renderWithMemoryRoute(<RegisterPage />, { route: '/register' });

        await fillForm('Ab1!xyz');

        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('submits an 8-character password with two character classes', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ message: 'Registration received. You can now sign in.' }), { status: 202 }),
        );
        vi.stubGlobal('fetch', fetchMock);
        renderWithMemoryRoute(<RegisterPage />, { route: '/register' });

        await fillForm('Abcdef1g');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(await screen.findByRole('heading', { name: /account created/i })).toBeInTheDocument();
    });
});
