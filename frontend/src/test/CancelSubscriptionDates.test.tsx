import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionCancelCard from '../components/subscription-detail/SubscriptionCancelCard';
import type { SubscriptionCardModel } from '../components/subscription-detail/SubscriptionHeaderCard';
import { isAfterToday, todayIsoDate } from '../utils/dates';

const subscription: SubscriptionCardModel = {
    id: 7,
    serviceName: 'Netflix',
    category: 'Streaming',
    amount: 9.99,
    currency: 'EUR',
    billingCadence: 'monthly',
    nextBillingDate: '2099-01-15',
    notes: null,
    status: 'active',
    autoRenew: true,
    b2b: false,
    cancelledAt: null,
};

const daysFromToday = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return todayIsoDate(date);
};

describe('provider cancellation dates', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...subscription, status: 'cancelled' }), { status: 200 })));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    const renderCard = async () => {
        const user = userEvent.setup();
        render(<SubscriptionCancelCard subscription={subscription} token="t" onUnauthorized={vi.fn()} onCancelled={vi.fn()} onKeepTracking={vi.fn()} />);
        await user.click(screen.getByLabelText(/yes, cancelled with provider/i));
        return { user, cancellation: screen.getByLabelText(/provider cancellation date/i), accessEnds: screen.getByLabelText(/access ends/i) };
    };

    it('detects future dates by the local calendar day', () => {
        const now = new Date(2026, 10, 2, 9, 0);
        expect(isAfterToday('2026-11-03', now)).toBe(true);
        expect(isAfterToday('2026-11-02', now)).toBe(false);
    });

    it('limits the cancellation date to today and access to on or after the cancellation', async () => {
        const { cancellation, accessEnds } = await renderCard();
        expect(cancellation).toHaveAttribute('max', todayIsoDate());

        fireEvent.change(cancellation, { target: { value: daysFromToday(-3) } });
        expect(accessEnds).toHaveAttribute('min', daysFromToday(-3));
    });

    it('rejects a future cancellation date without saving', async () => {
        const { user, cancellation } = await renderCard();
        fireEvent.change(cancellation, { target: { value: daysFromToday(1) } });
        await user.click(screen.getByRole('button', { name: /mark as cancelled/i }));

        expect(screen.getByText("The provider cancellation date can't be in the future.")).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects access ending before the cancellation date', async () => {
        const { user, cancellation, accessEnds } = await renderCard();
        fireEvent.change(cancellation, { target: { value: daysFromToday(-1) } });
        fireEvent.change(accessEnds, { target: { value: daysFromToday(-5) } });
        await user.click(screen.getByRole('button', { name: /mark as cancelled/i }));

        expect(screen.getByText("Access can't end before the provider cancellation date.")).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('saves a cancellation from today with access running into the future', async () => {
        const { user, cancellation, accessEnds } = await renderCard();
        fireEvent.change(cancellation, { target: { value: todayIsoDate() } });
        fireEvent.change(accessEnds, { target: { value: daysFromToday(20) } });
        await user.click(screen.getByRole('button', { name: /mark as cancelled/i }));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
        expect(body).toMatchObject({ status: 'cancelled', cancelledAt: todayIsoDate(), nextBillingDate: daysFromToday(20) });
    });
});
