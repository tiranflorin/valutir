import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import { renderWithMemoryRoute } from './test-utils';

describe('MySubscriptionsPage', () => {
    it('renders the subscriptions overview', () => {
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(
            screen.getByRole('heading', { name: /my subs/i })
        ).toBeInTheDocument();
    });

    it('shows page heading', () => {
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(
            screen.getByRole('heading', { name: /my subs/i })
        ).toBeInTheDocument();
    });

    it('shows add subscription action', () => {
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(
            screen.getByRole('link', { name: /add subscription/i })
        ).toBeInTheDocument();
    });
});
