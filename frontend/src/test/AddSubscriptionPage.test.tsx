import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddSubscriptionPage from '../pages/AddSubscriptionPage';
import { renderWithMemoryRoute } from './test-utils';

describe('AddSubscriptionPage', () => {
    it('renders the main form fields and sections', () => {
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/my-subs/new' });

        expect(screen.getByText(/add subscription/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/service name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
        expect(screen.getByText(/core details/i)).toBeInTheDocument();
    });

    it('updates live summary when service name changes', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/my-subs/new' });

        await user.type(screen.getByLabelText(/service name/i), 'Netflix');
        expect(screen.getByText(/netflix/i)).toBeInTheDocument();
    });

    it('updates normalized yearly value when amount changes', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/my-subs/new' });

        const amountInput = screen.getByLabelText(/price/i);
        await user.clear(amountInput);
        await user.type(amountInput, '20');

        expect(screen.getByText(/normalized yearly/i)).toBeInTheDocument();
        expect(screen.getByText(/240\.00 eur/i)).toBeInTheDocument();
    });

    it('recalculates normalized values when billing cadence changes to yearly', async () => {
        const user = userEvent.setup();
        renderWithMemoryRoute(<AddSubscriptionPage />, { route: '/my-subs/new' });

        await user.click(screen.getByRole('button', { name: /yearly/i }));

        expect(screen.getByText(/normalized yearly/i)).toBeInTheDocument();
        expect(screen.getByText(/15\.99 eur/i)).toBeInTheDocument();
        expect(screen.getByText(/1\.33 eur/i)).toBeInTheDocument();
    });
});
