import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../App';
import type { SubscriptionRecord } from '../types/subscription';
import { todayIsoDate } from '../utils/dates';
import { STORAGE_KEY, authHeader, bodyOf, callsTo, mockApi, profile, signIn, type Handlers } from './api';

const daysFromToday = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return todayIsoDate(date);
};

const renderApp = (route: string) => render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);

const record = (overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
    id: 1, serviceName: 'Netflix', amount: '13.99', currency: 'EUR', billingCadence: 'monthly', category: 'Streaming',
    status: 'active', startedAt: '2026-01-01', nextBillingDate: '2099-01-15', notes: null, paymentMethod: null, manageUrl: null,
    isActive: true, autoRenew: true, b2b: false, householdShared: false, householdSize: null, cancelledAt: null,
    createdAt: '', updatedAt: '', trialEndsAt: null, trialReminderSentAt: null,
    resumesOn: null, reviewFlagged: false, reviewFlaggedAt: null, reviewNote: null,
    ...overrides,
});

/** An in-memory /api/subs, so each step of a flow sees what the previous one saved. */
const fakeBackend = (initial: SubscriptionRecord[]) => {
    let subscriptions = [...initial];
    const handlers: Handlers = {
        'GET /api/profile': () => ({ status: 200, body: profile() }),
        'GET /api/subs': () => ({ status: 200, body: subscriptions }),
        'POST /api/subs': (call) => {
            const created = record({ ...bodyOf(call), id: 100, amount: String(bodyOf(call).amount) });
            subscriptions = [...subscriptions, created];
            return { status: 201, body: created };
        },
    };
    for (const { id } of initial) {
        handlers[`GET /api/subs/${id}`] = () => ({ status: 200, body: subscriptions.find((item) => item.id === id) });
        handlers[`PATCH /api/subs/${id}`] = (call) => {
            const payload = bodyOf(call);
            subscriptions = subscriptions.map((item) => (item.id === id ? { ...item, ...payload, amount: String(payload.amount) } : item));
            return { status: 200, body: subscriptions.find((item) => item.id === id) };
        };
        handlers[`PUT /api/subs/${id}/review`] = (call) => {
            const { note } = bodyOf(call);
            subscriptions = subscriptions.map((item) => (item.id === id
                ? { ...item, reviewFlagged: true, reviewFlaggedAt: item.reviewFlaggedAt ?? '2026-11-06T10:00:00+00:00', reviewNote: note ?? null }
                : item));
            return { status: 200, body: subscriptions.find((item) => item.id === id) };
        };
        handlers[`DELETE /api/subs/${id}/review`] = () => {
            subscriptions = subscriptions.map((item) => (item.id === id ? { ...item, reviewFlagged: false, reviewFlaggedAt: null, reviewNote: null } : item));
            return { status: 200, body: subscriptions.find((item) => item.id === id) };
        };
        handlers[`DELETE /api/subs/${id}`] = () => {
            subscriptions = subscriptions.filter((item) => item.id !== id);
            return { status: 204 };
        };
    }

    return mockApi(handlers);
};

describe('adding a subscription', () => {
    it('saves it and lists it on the dashboard', async () => {
        signIn();
        const calls = fakeBackend([]);
        const user = userEvent.setup();
        renderApp('/my-subs');

        expect(await screen.findByRole('heading', { name: 'No subscriptions yet' })).toBeInTheDocument();
        await user.click(screen.getAllByRole('link', { name: /add subscription/i })[0]);
        fireEvent.change(await screen.findByLabelText(/service name/i), { target: { value: 'Netflix' } });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '13.99' } });
        fireEvent.change(screen.getByLabelText(/next billing date/i), { target: { value: todayIsoDate() } });
        await user.click(screen.getByRole('button', { name: 'Save subscription' }));

        expect(await screen.findByRole('row', { name: /netflix/i })).toBeInTheDocument();
        const [create] = callsTo(calls, 'POST /api/subs');
        expect(authHeader(create)).toMatch(/^Bearer /);
        expect(bodyOf(create)).toMatchObject({
            serviceName: 'Netflix', amount: 13.99, currency: 'EUR', billingCadence: 'monthly', status: 'active',
            startedAt: todayIsoDate(), nextBillingDate: todayIsoDate(), trialEndsAt: null, cancelledAt: null,
            autoRenew: true, b2b: false, householdShared: false, householdSize: null,
        });
    });

    it('rejects a past next billing date without calling the API', async () => {
        signIn();
        const calls = fakeBackend([]);
        renderApp('/subscriptions/new');

        expect(screen.getByLabelText(/next billing date/i)).toHaveAttribute('min', todayIsoDate());
        fireEvent.change(screen.getByLabelText(/service name/i), { target: { value: 'Netflix' } });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '9.99' } });
        fireEvent.change(screen.getByLabelText(/next billing date/i), { target: { value: '2020-01-01' } });
        // Submit directly so the app's own check runs, not only the browser's min validation.
        fireEvent.submit(screen.getByLabelText(/price/i).closest('form')!);

        expect(await screen.findByText("Next billing date can't be in the past.")).toBeInTheDocument();
        expect(callsTo(calls, 'POST /api/subs')).toHaveLength(0);
    });
});

describe('statuses', () => {
    it('offers only Active and Trial for a new subscription', async () => {
        signIn();
        fakeBackend([]);
        renderApp('/subscriptions/new');

        await screen.findByLabelText(/service name/i);
        // "Other" is still a category; only the status picker is checked here.
        const statusField = document.querySelector('.subscription-status-field') as HTMLElement;
        expect(within(statusField).getAllByRole('button').map((chip) => chip.textContent)).toEqual(['Active', 'Trial']);
    });

    it('pauses a subscription until a resume date', async () => {
        signIn();
        const calls = fakeBackend([record()]);
        const user = userEvent.setup();
        renderApp('/subscriptions/1');

        await user.click(await screen.findByRole('button', { name: 'Edit subscription' }));
        await user.click(screen.getByRole('button', { name: 'Paused' }));
        fireEvent.change(screen.getByLabelText(/resumes on/i), { target: { value: '2099-03-01' } });
        await user.click(screen.getByRole('button', { name: 'Save changes' }));

        expect(await screen.findByText('Paused until 1 Mar 2099')).toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'PATCH /api/subs/1')[0])).toMatchObject({ status: 'paused', resumesOn: '2099-03-01', cancelledAt: null });
    });

    it('flags a subscription for review with a note, then keeps it', async () => {
        signIn();
        const calls = fakeBackend([record()]);
        const user = userEvent.setup();
        renderApp('/subscriptions/1');

        await user.type(await screen.findByLabelText(/note \(optional\)/i), 'Do the kids still use it?');
        await user.click(screen.getByRole('button', { name: 'Flag for review' }));

        expect(await screen.findByRole('heading', { name: 'Flagged for review' })).toBeInTheDocument();
        expect(screen.getByText('“Do the kids still use it?”')).toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'PUT /api/subs/1/review')[0])).toEqual({ note: 'Do the kids still use it?' });
        // A flag, not a status: the subscription stays active.
        expect(screen.getAllByText('Active').length).toBeGreaterThan(0);

        await user.click(screen.getByRole('button', { name: 'Keep it, clear the flag' }));
        expect(await screen.findByRole('heading', { name: 'Not sure you still need it?' })).toBeInTheDocument();
        expect(callsTo(calls, 'DELETE /api/subs/1/review')).toHaveLength(1);
    });
});

describe('managing a subscription from its detail page', () => {
    it('edits the price and sends every field (updates replace the whole subscription)', async () => {
        signIn();
        const calls = fakeBackend([record({ householdShared: true, householdSize: 3, paymentMethod: 'Visa' })]);
        const user = userEvent.setup();
        renderApp('/subscriptions/1');

        await user.click(await screen.findByRole('button', { name: 'Edit subscription' }));
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '15.49' } });
        await user.click(screen.getByRole('button', { name: 'Save changes' }));

        expect(await screen.findByText(/15\.49 EUR/)).toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'PATCH /api/subs/1')[0])).toMatchObject({
            serviceName: 'Netflix', amount: 15.49, currency: 'EUR', billingCadence: 'monthly', status: 'active',
            nextBillingDate: '2099-01-15', autoRenew: true, b2b: false, householdShared: true, householdSize: 3,
            startedAt: '2026-01-01', paymentMethod: 'Visa',
        });
    });

    it('marks it cancelled with the provider, then removes it from the tracker', async () => {
        signIn();
        const calls = fakeBackend([record()]);
        const user = userEvent.setup();
        renderApp('/subscriptions/1');

        await user.click(await screen.findByRole('button', { name: 'Cancel subscription' }));
        await user.click(screen.getByLabelText(/yes, cancelled with provider/i));
        fireEvent.change(screen.getByLabelText(/provider cancellation date/i), { target: { value: todayIsoDate() } });
        await user.click(screen.getByRole('button', { name: /mark as cancelled/i }));
        expect(bodyOf(callsTo(calls, 'PATCH /api/subs/1')[0])).toMatchObject({ status: 'cancelled', cancelledAt: todayIsoDate() });

        await user.click(await screen.findByRole('button', { name: /yes, i used it and it was useful/i }));
        await user.click(screen.getByRole('button', { name: 'Continue to removal' }));
        await user.click(screen.getByRole('button', { name: /remove subscription/i }));

        expect(await screen.findByText('Subscription deleted successfully.')).toBeInTheDocument();
        expect(screen.queryByRole('row', { name: /netflix/i })).not.toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'DELETE /api/subs/1')[0])).toEqual({ usedAndUseful: true });
    });

    it('re-enables a cancelled subscription at a new price, starting a new billing cycle', async () => {
        signIn();
        const calls = fakeBackend([record({ status: 'cancelled', autoRenew: false, cancelledAt: daysFromToday(-30), nextBillingDate: daysFromToday(-20) })]);
        const user = userEvent.setup();
        renderApp('/subscriptions/1');

        await user.click(await screen.findByRole('button', { name: 'Yes' }));
        const reenabledFrom = screen.getByLabelText(/re-enabled from/i);
        expect(reenabledFrom).toHaveAttribute('min', daysFromToday(-30));
        expect(reenabledFrom).toHaveAttribute('max', todayIsoDate());
        fireEvent.change(reenabledFrom, { target: { value: todayIsoDate() } });
        fireEvent.change(screen.getByLabelText(/^price/i), { target: { value: '15.99' } });
        await user.click(screen.getByRole('button', { name: 'Re-enable subscription' }));

        expect(await screen.findByRole('button', { name: 'Edit subscription' })).toBeInTheDocument();
        expect(bodyOf(callsTo(calls, 'PATCH /api/subs/1')[0])).toMatchObject({
            status: 'active', autoRenew: true, cancelledAt: null, amount: 15.99, startedAt: todayIsoDate(),
            // Charged on the restart day, not on the old cycle's date.
            nextBillingDate: todayIsoDate(),
        });
    });

    it.each([
        [1, "The re-enabled date can't be in the future."],
        [-31, "The re-enabled date can't be before the cancellation date."],
    ])('rejects a re-enabled date %i days from today without saving', async (days, message) => {
        signIn();
        const calls = fakeBackend([record({ status: 'cancelled', autoRenew: false, cancelledAt: daysFromToday(-30) })]);
        const user = userEvent.setup();
        renderApp('/subscriptions/1');

        await user.click(await screen.findByRole('button', { name: 'Yes' }));
        fireEvent.change(screen.getByLabelText(/re-enabled from/i), { target: { value: daysFromToday(days) } });
        await user.click(screen.getByRole('button', { name: 'Re-enable subscription' }));

        expect(screen.getByText(message)).toBeInTheDocument();
        expect(callsTo(calls, 'PATCH /api/subs/1')).toHaveLength(0);
    });

    it('sends the user to sign in again when the session has expired', async () => {
        signIn();
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs/1': () => ({ status: 401, body: { message: 'Expired JWT Token' } }),
            'POST /api/logout': () => ({ status: 401 }),
        });
        renderApp('/subscriptions/1');

        expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});
