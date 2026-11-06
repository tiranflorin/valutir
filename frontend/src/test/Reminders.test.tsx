import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreferencesPage from '../pages/PreferencesPage';
import UnsubscribePage from '../pages/auth/UnsubscribePage';
import { bodyOf, callsTo, mockApi, profile, signIn, type ApiCall } from './api';
import { renderWithMemoryRoute } from './test-utils';

const bucharest = profile({ timezone: 'Europe/Bucharest' });
const preferencesApi = () => mockApi({
    'GET /api/profile': () => ({ status: 200, body: bucharest }),
    'PATCH /api/profile': (call) => ({ status: 200, body: { ...bucharest, ...bodyOf(call) } }),
});
const patches = (calls: ApiCall[]) => callsTo(calls, 'PATCH /api/profile').map(bodyOf);

describe('payment reminder preferences', () => {
    beforeEach(() => {
        signIn();
    });

    it('shows the saved time zone and turns reminders off', async () => {
        const calls = preferencesApi();
        const user = userEvent.setup();
        renderWithMemoryRoute(<PreferencesPage />, { route: '/preferences' });

        expect(await screen.findByDisplayValue('Europe/Bucharest')).toBeInTheDocument();
        const toggle = screen.getByRole('checkbox', { name: /email me before upcoming payments/i });
        expect(toggle).toBeChecked();

        await user.click(toggle);

        expect(await screen.findByText(/payment reminders are off/i)).toBeInTheDocument();
        expect(patches(calls)).toEqual([{ remindersEnabled: false }]);
        expect(toggle).not.toBeChecked();
    });

    it('saves a newly chosen time zone', async () => {
        const calls = preferencesApi();
        const user = userEvent.setup();
        renderWithMemoryRoute(<PreferencesPage />, { route: '/preferences' });
        const input = await screen.findByDisplayValue('Europe/Bucharest');

        await user.clear(input);
        await user.type(input, 'Europe/Lisbon');
        await user.click(await screen.findByRole('option', { name: 'Europe/Lisbon' }));
        await user.click(screen.getByRole('button', { name: /save time zone/i }));

        expect(await screen.findByText('Your time zone is now Europe/Lisbon.')).toBeInTheDocument();
        expect(patches(calls)).toEqual([{ timezone: 'Europe/Lisbon' }]);
    });
});

describe('unsubscribe link', () => {
    it('turns reminders off once with the token from the email', async () => {
        const calls = mockApi({ 'POST /api/reminders/unsubscribe': () => ({ status: 200, body: { message: "You won't get payment reminder emails anymore." } }) });
        renderWithMemoryRoute(<UnsubscribePage />, { route: '/unsubscribe?token=7.abc' });

        expect(await screen.findByRole('heading', { name: /reminders turned off/i })).toBeInTheDocument();
        await waitFor(() => expect(calls).toHaveLength(1));
        expect(calls[0].url).toMatch(/\/api\/reminders\/unsubscribe\?token=7\.abc$/);
        expect(calls[0].init.method).toBe('POST');
    });

    it('explains an invalid link', async () => {
        mockApi({ 'POST /api/reminders/unsubscribe': () => ({ status: 400, body: { message: 'This unsubscribe link is invalid.' } }) });
        renderWithMemoryRoute(<UnsubscribePage />, { route: '/unsubscribe?token=bad' });

        expect(await screen.findByText('This unsubscribe link is invalid.')).toBeInTheDocument();
    });
});
