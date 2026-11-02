import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreferencesPage from '../pages/PreferencesPage';
import UnsubscribePage from '../pages/auth/UnsubscribePage';
import { renderWithMemoryRoute } from './test-utils';

const profile = { email: 'ada@example.test', name: 'Ada', defaultCurrency: 'EUR', timezone: 'Europe/Bucharest', remindersEnabled: true, pendingEmail: null };

type Call = { url: string; init: RequestInit };
const mockApi = (respond: (call: Call) => { status: number; body: unknown }) => {
    const calls: Call[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
        const call = { url: String(url), init };
        calls.push(call);
        const { status, body } = respond(call);
        return new Response(JSON.stringify(body), { status });
    }));
    return calls;
};
const patches = (calls: Call[]) => calls.filter((c) => c.init.method === 'PATCH').map((c) => JSON.parse(String(c.init.body)));

describe('payment reminder preferences', () => {
    beforeEach(() => {
        window.localStorage.setItem('valutir_auth_token', `header.${btoa(JSON.stringify({ username: 'ada@example.test' }))}.signature`);
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('shows the saved time zone and turns reminders off', async () => {
        const calls = mockApi(({ init }) => ({ status: 200, body: init.method === 'PATCH' ? { ...profile, ...JSON.parse(String(init.body)) } : profile }));
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
        const calls = mockApi(({ init }) => ({ status: 200, body: init.method === 'PATCH' ? { ...profile, ...JSON.parse(String(init.body)) } : profile }));
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
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('turns reminders off once with the token from the email', async () => {
        const calls = mockApi(() => ({ status: 200, body: { message: "You won't get payment reminder emails anymore." } }));
        renderWithMemoryRoute(<UnsubscribePage />, { route: '/unsubscribe?token=7.abc' });

        expect(await screen.findByRole('heading', { name: /reminders turned off/i })).toBeInTheDocument();
        await waitFor(() => expect(calls).toHaveLength(1));
        expect(calls[0].url).toMatch(/\/api\/reminders\/unsubscribe\?token=7\.abc$/);
        expect(calls[0].init.method).toBe('POST');
    });

    it('explains an invalid link', async () => {
        mockApi(() => ({ status: 400, body: { message: 'This unsubscribe link is invalid.' } }));
        renderWithMemoryRoute(<UnsubscribePage />, { route: '/unsubscribe?token=bad' });

        expect(await screen.findByText('This unsubscribe link is invalid.')).toBeInTheDocument();
    });
});
