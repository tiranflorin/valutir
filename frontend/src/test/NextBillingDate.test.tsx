import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import AddSubscriptionPage from '../pages/AddSubscriptionPage';
import { isBeforeToday, todayIsoDate } from '../utils/dates';
import { renderWithMemoryRoute } from './test-utils';

describe('date helpers', () => {
    it('uses the local calendar date, also just after midnight', () => {
        // 00:30 local time is still the previous day in UTC for zones east of UTC.
        expect(todayIsoDate(new Date(2026, 10, 2, 0, 30))).toBe('2026-11-02');
        expect(todayIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });

    it('treats only earlier days as past', () => {
        const now = new Date(2026, 10, 2, 9, 0);
        expect(isBeforeToday('2026-11-01', now)).toBe(true);
        expect(isBeforeToday('2026-11-02', now)).toBe(false);
        expect(isBeforeToday('2026-12-31', now)).toBe(false);
    });
});

describe('next billing date on the add form', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        window.localStorage.setItem('valutir_auth_token', `header.${btoa(JSON.stringify({ username: 'ada@example.test' }))}.signature`);
        vi.stubGlobal('fetch', fetchMock.mockResolvedValue(new Response('{}', { status: 200 })));
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    it('does not offer dates before today in the picker', () => {
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/subscriptions/new' });

        expect(screen.getByLabelText(/next billing date/i)).toHaveAttribute('min', todayIsoDate());
    });

    it('rejects a past date typed into the field without calling the API', async () => {
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/subscriptions/new' });
        fireEvent.change(screen.getByLabelText(/service name/i), { target: { value: 'Netflix' } });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '9.99' } });
        const dateInput = screen.getByLabelText(/next billing date/i);
        fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

        // Submit directly so the app's own check runs, not only the browser's min validation.
        fireEvent.submit(dateInput.closest('form')!);

        expect(await screen.findByText("Next billing date can't be in the past.")).toBeInTheDocument();
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/subs'))).toHaveLength(0);
    });
});
