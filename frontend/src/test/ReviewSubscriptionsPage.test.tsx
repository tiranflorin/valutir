import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import ReviewSubscriptionsPage from '../pages/ReviewSubscriptionsPage';
import { todayIsoDate } from '../utils/dates';
import { bodyOf, callsTo, mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const subscription = (id: number, serviceName: string, extra: Record<string, unknown> = {}) => ({
    id,
    serviceName,
    amount: '9.99',
    currency: 'EUR',
    billingCadence: 'monthly',
    category: 'Streaming',
    status: 'active',
    startedAt: '2026-01-01',
    nextBillingDate: '2099-01-15',
    notes: null,
    paymentMethod: null,
    cancelledAt: null,
    trialEndsAt: null,
    trialReminderSentAt: null,
    b2b: false,
    autoRenew: true,
    householdShared: false,
    householdSize: null,
    resumesOn: null,
    reviewFlagged: false,
    reviewFlaggedAt: null,
    reviewNote: null,
    ...extra,
});

const items = [
    subscription(1, 'Spotify', { amount: '5.99' }),
    subscription(2, 'Gym', { amount: '40.00', category: 'Health', householdShared: true, householdSize: 2, notes: 'Front desk cancels' }),
    subscription(3, 'Netflix', { reviewFlagged: true, reviewFlaggedAt: '2026-11-01T10:00:00+00:00', reviewNote: 'Do we still watch it?' }),
    subscription(4, 'Old Gym', { status: 'paused' }),
    subscription(5, 'Gone', { status: 'cancelled', cancelledAt: '2026-10-01' }),
];

const reviewApi = (list: unknown[]) => mockApi({
    'GET /api/profile': () => ({ status: 200, body: profile() }),
    'GET /api/subs': () => ({ status: 200, body: list }),
    'DELETE /api/subs/3/review': () => ({ status: 200, body: { ...items[2], reviewFlagged: false, reviewNote: null } }),
    'PATCH /api/subs/2': ({ init }) => ({ status: 200, body: { ...items[1], ...JSON.parse(String(init.body)) } }),
});

const cardName = () => screen.getByRole('heading', { level: 2 }).textContent;

describe('keep-or-cancel review', () => {
    beforeEach(() => {
        signIn();
    });

    it('walks flagged first, then by cost: keep clears the flag, cancel saves every field, skip changes nothing', async () => {
        const calls = reviewApi(items);
        const user = userEvent.setup();
        renderWithMemoryRoute(<ReviewSubscriptionsPage />, { route: '/review' });

        // Paused and cancelled ones aren't reviewed.
        expect(await screen.findByText('1 of 3')).toBeInTheDocument();
        expect(cardName()).toBe('Netflix');
        expect(screen.getByText('“Do we still watch it?”')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Keep' }));
        expect(callsTo(calls, 'DELETE /api/subs/3/review')).toHaveLength(1);

        expect(await screen.findByText('2 of 3')).toBeInTheDocument();
        expect(cardName()).toBe('Gym');
        expect(screen.getByTestId('keep-review-yearly')).toHaveTextContent('€480.00');
        expect(screen.getByText('Front desk cancels')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Cancel it' }));
        await user.click(screen.getByLabelText(/yes, cancelled with provider/i));
        fireEvent.change(screen.getByLabelText(/provider cancellation date/i), { target: { value: todayIsoDate() } });
        await user.click(screen.getByRole('button', { name: /mark as cancelled/i }));

        const [cancel] = callsTo(calls, 'PATCH /api/subs/2');
        expect(bodyOf(cancel)).toEqual({
            serviceName: 'Gym',
            amount: 40,
            currency: 'EUR',
            billingCadence: 'monthly',
            category: 'Health',
            startedAt: '2026-01-01',
            nextBillingDate: '2099-01-15',
            notes: 'Front desk cancels',
            paymentMethod: null,
            status: 'cancelled',
            autoRenew: false,
            b2b: false,
            householdShared: true,
            householdSize: 2,
            cancelledAt: todayIsoDate(),
            trialEndsAt: null,
            resumesOn: null,
        });

        expect(await screen.findByText('3 of 3')).toBeInTheDocument();
        expect(cardName()).toBe('Spotify');
        await user.click(screen.getByRole('button', { name: 'Skip' }));

        expect(await screen.findByRole('heading', { name: 'Review done' })).toBeInTheDocument();
        const results = within(screen.getByRole('list', { name: 'Review results' })).getAllByRole('listitem').map((item) => item.textContent);
        expect(results).toEqual(['1 kept', '1 cancelled', '1 skipped']);
        expect(screen.getByTestId('keep-review-saving')).toHaveTextContent('You’ll save €480.00 a year.');
        expect(callsTo(calls, 'PATCH /api/subs/1')).toHaveLength(0);
    });

    it('works from the keyboard, and keeping an unflagged one sends nothing', async () => {
        const calls = reviewApi([subscription(1, 'Spotify'), subscription(2, 'Netflix', { amount: '1.00' })]);
        const user = userEvent.setup();
        renderWithMemoryRoute(<ReviewSubscriptionsPage />, { route: '/review' });

        expect(await screen.findByText('1 of 2')).toBeInTheDocument();
        await user.keyboard('k');
        expect(await screen.findByText('2 of 2')).toBeInTheDocument();
        await user.keyboard('{ArrowDown}');

        expect(await screen.findByRole('heading', { name: 'Review done' })).toBeInTheDocument();
        expect(screen.getByText(/Everything you pay for stays/)).toBeInTheDocument();
        expect(calls.filter((call) => call.key !== 'GET /api/subs' && call.key !== 'GET /api/profile')).toHaveLength(0);
    });

    it('reviews only the business view when that is selected', async () => {
        window.localStorage.setItem('valutir_dashboard_view', 'business');
        reviewApi([subscription(1, 'Spotify'), subscription(2, 'Figma', { b2b: true })]);
        renderWithMemoryRoute(<ReviewSubscriptionsPage />, { route: '/review' });

        expect(await screen.findByText('1 of 1')).toBeInTheDocument();
        expect(cardName()).toBe('Figma');
    });
});

describe('dashboard review entry', () => {
    beforeEach(() => {
        signIn();
    });

    it('offers the review from 3 charged subscriptions, not counting paused ones', async () => {
        reviewApi(items);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(await screen.findByRole('link', { name: 'Review my subscriptions' })).toHaveAttribute('href', '/review');
    });

    it('hides it with fewer', async () => {
        reviewApi([items[0], items[1], items[3]]);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await screen.findByText(/^My subscriptions ·/);
        expect(screen.queryByRole('link', { name: 'Review my subscriptions' })).not.toBeInTheDocument();
    });
});
