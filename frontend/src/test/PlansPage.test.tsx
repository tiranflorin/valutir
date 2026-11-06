import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlansPage from '../pages/PlansPage';
import { isStripeCheckoutUrl } from '../services/account';
import { callsTo, mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const freeStatus = {
    unlocked: false,
    unlockedAt: null,
    checkoutAvailable: true,
    price: { amountInCents: 1999, currency: 'EUR', taxInclusive: true },
    freeActiveLimit: 50,
    activeCount: 12,
};

describe('plans page checkout', () => {
    const assign = vi.fn();
    const originalLocation = window.location;

    beforeEach(() => {
        signIn();
        Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, assign } });
    });

    afterEach(() => {
        assign.mockReset();
        Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('shows the price and usage, then sends the browser to Stripe Checkout', async () => {
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/billing': () => ({ status: 200, body: freeStatus }),
            'POST /api/billing/checkout': () => ({ status: 200, body: { url: 'https://checkout.stripe.com/c/pay/cs_test_1' } }),
        });
        renderWithMemoryRoute(<PlansPage />, { route: '/plans' });

        expect(await screen.findByText('You have 12 of 50 active subscriptions on the free plan.')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Pay €19.99 once' }));

        await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1'));
        expect(callsTo(calls, 'POST /api/billing/checkout')).toHaveLength(1);
    });

    it('never redirects anywhere but Stripe Checkout', async () => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/billing': () => ({ status: 200, body: freeStatus }),
            'POST /api/billing/checkout': () => ({ status: 200, body: { url: 'https://evil.example/pay' } }),
        });
        renderWithMemoryRoute(<PlansPage />, { route: '/plans' });

        await userEvent.click(await screen.findByRole('button', { name: 'Pay €19.99 once' }));

        expect(await screen.findByText('Unable to start the payment. Please try again later.')).toBeInTheDocument();
        expect(assign).not.toHaveBeenCalled();
    });

    it('confirms the unlock after returning from a successful payment', async () => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/billing': () => ({ status: 200, body: { ...freeStatus, unlocked: true, unlockedAt: '2026-11-03T10:00:00+00:00' } }),
        });
        renderWithMemoryRoute(<PlansPage />, { route: '/plans?checkout=success' });

        expect(await screen.findByText('Your account is unlocked. Thank you!')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Unlocked on this account' })).toBeDisabled();
    });

    it('tells the user a cancelled payment cost nothing', async () => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/billing': () => ({ status: 200, body: freeStatus }),
        });
        renderWithMemoryRoute(<PlansPage />, { route: '/plans?checkout=cancelled' });

        expect(await screen.findByText('Payment cancelled. You were not charged.')).toBeInTheDocument();
    });

    it('disables the upgrade when the server has no payment keys', async () => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/billing': () => ({ status: 200, body: { ...freeStatus, checkoutAvailable: false } }),
        });
        renderWithMemoryRoute(<PlansPage />, { route: '/plans' });

        expect(await screen.findByText('Payments are not available right now. Please try again later.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pay €19.99 once' })).toBeDisabled();
    });

    it('asks visitors to create an account first', () => {
        window.localStorage.clear();
        mockApi({});
        renderWithMemoryRoute(<PlansPage />, { route: '/plans' });

        expect(screen.getByRole('link', { name: 'Create a free account to upgrade' })).toHaveAttribute('href', '/register');
    });
});

describe('isStripeCheckoutUrl', () => {
    it.each([
        ['https://checkout.stripe.com/c/pay/cs_test_1', true],
        ['https://checkout.stripe.com.evil.example/c/pay', false],
        ['http://checkout.stripe.com/c/pay', false],
        ['javascript:alert(1)', false],
        ['not a url', false],
    ])('%s -> %s', (url, expected) => {
        expect(isStripeCheckoutUrl(url)).toBe(expected);
    });
});
