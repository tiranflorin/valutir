import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddSubscriptionPage from '../pages/AddSubscriptionPage';
import SubscriptionCancelCard from '../components/subscription-detail/SubscriptionCancelCard';
import type { SubscriptionCardModel } from '../components/subscription-detail/SubscriptionHeaderCard';
import { householdPayload, shareOf, splitCount } from '../utils/householdShare';
import { todayIsoDate } from '../utils/dates';
import { renderWithMemoryRoute } from './test-utils';

describe('household share helpers', () => {
    it('splits equally and treats unshared subscriptions as one person', () => {
        expect(shareOf(13.99, { householdShared: true, householdSize: 4 })).toBeCloseTo(3.4975);
        expect(splitCount({ householdShared: false, householdSize: 4 })).toBe(1);
        expect(splitCount({ householdShared: true, householdSize: null })).toBe(1);
    });

    it('never sends sharing for business subscriptions', () => {
        expect(householdPayload({ householdShared: true, householdSize: 3, b2b: false })).toEqual({ householdShared: true, householdSize: 3 });
        expect(householdPayload({ householdShared: true, householdSize: 3, b2b: true })).toEqual({ householdShared: false, householdSize: null });
        expect(householdPayload({ householdShared: false, householdSize: 3, b2b: false })).toEqual({ householdShared: false, householdSize: null });
    });
});

describe('household sharing on the add form', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        window.localStorage.setItem('valutir_auth_token', `header.${btoa(JSON.stringify({ username: 'ada@example.test' }))}.signature`);
        window.localStorage.setItem('valutir_dashboard_view', 'personal');
        vi.stubGlobal('fetch', fetchMock.mockImplementation(async () => new Response(JSON.stringify({ id: 1 }), { status: 201 })));
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    it('shows the split and your share, and sends both to the API', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/subscriptions/new' });
        fireEvent.change(screen.getByLabelText(/service name/i), { target: { value: 'Netflix' } });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '13.99' } });
        fireEvent.change(screen.getByLabelText(/next billing date/i), { target: { value: todayIsoDate() } });

        await user.click(screen.getByRole('button', { name: /optional details/i }));
        await user.click(screen.getByRole('button', { name: 'Not shared' }));
        await user.click(screen.getByRole('combobox', { name: /split between/i }));
        await user.click(screen.getByRole('option', { name: '4 people' }));

        expect(screen.getByText(/your share/i)).toHaveTextContent('Your share: 3.50 EUR per monthly bill');

        fireEvent.submit(screen.getByLabelText(/service name/i).closest('form')!);
        const createCall = await vi.waitFor(() => {
            const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/subs') && init?.method === 'POST');
            expect(call).toBeDefined();
            return call!;
        });
        expect(JSON.parse(String(createCall[1].body))).toMatchObject({ householdShared: true, householdSize: 4, b2b: false });
    });

    it('hides sharing for business subscriptions and turns it off', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/subscriptions/new' });
        await user.click(screen.getByRole('button', { name: /optional details/i }));
        await user.click(screen.getByRole('button', { name: 'Not shared' }));
        expect(screen.getByRole('button', { name: 'Shared' })).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: /business subscription/i }));

        expect(screen.queryByText('Household shared')).not.toBeInTheDocument();
        await user.click(screen.getByRole('checkbox', { name: /business subscription/i }));
        expect(screen.getByRole('button', { name: 'Not shared' })).toBeInTheDocument();
    });
});

describe('cancelling a shared subscription', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('keeps the sharing details (updates replace every field)', async () => {
        const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const subscription: SubscriptionCardModel = {
            id: 3, serviceName: 'Spotify', category: null, amount: 16.99, currency: 'EUR', billingCadence: 'monthly',
            nextBillingDate: null, notes: null, status: 'active', autoRenew: true, b2b: false, cancelledAt: null,
            householdShared: true, householdSize: 3,
        };
        const user = userEvent.setup();
        render(<SubscriptionCancelCard subscription={subscription} token="t" onUnauthorized={vi.fn()} onCancelled={vi.fn()} onKeepTracking={vi.fn()} />);
        await user.click(screen.getByLabelText(/yes, cancelled with provider/i));
        fireEvent.change(screen.getByLabelText(/provider cancellation date/i), { target: { value: todayIsoDate() } });
        await user.click(screen.getByRole('button', { name: /mark as cancelled/i }));

        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(JSON.parse(String(init.body))).toMatchObject({ status: 'cancelled', householdShared: true, householdSize: 3 });
    });
});
