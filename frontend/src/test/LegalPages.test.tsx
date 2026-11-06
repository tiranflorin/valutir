import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import AppFooter from '../components/AppFooter';
import PrivacyPage from '../pages/PrivacyPage';
import RefundPage from '../pages/RefundPage';
import TermsPage from '../pages/TermsPage';
import { mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

describe('legal pages', () => {
    it('is public and lists every cookie and storage key the app uses', () => {
        renderWithMemoryRoute(<PrivacyPage />, { route: '/privacy' });

        expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
        const cookies = screen.getByRole('heading', { name: '7. Cookies and browser storage' }).closest('section') as HTMLElement;
        // Keep in sync with the keys in AuthContext and MySubscriptionsPage (AGENTS.md: update this page first).
        for (const name of ['valutir_auth_token', 'valutir_dashboard_view', 'cf_clearance, __cf_bm', 'Stripe cookies']) {
            expect(within(cookies).getByText(name)).toBeInTheDocument();
        }
    });

    it('publishes the terms with the free limit, the price, and the refund guarantee', () => {
        renderWithMemoryRoute(<TermsPage />, { route: '/terms' });

        expect(screen.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument();
        expect(screen.getAllByText(/50 active subscriptions/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/€19\.99/).length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: 'Refund policy' })).toHaveAttribute('href', '/refunds');
    });

    it('publishes the 14-day money-back guarantee and how to ask for it', () => {
        renderWithMemoryRoute(<RefundPage />, { route: '/refunds' });

        expect(screen.getByRole('heading', { level: 1, name: 'Refund policy' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '1. The 14-day guarantee' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'contact form' })[0]).toHaveAttribute('href', '/contact');
    });

    it.each([
        ['a visitor', false],
        ['a signed-in user', true],
    ])('shows the Privacy, Terms, and Refunds links in the footer for %s, instead of Calendar', (_who, signedIn) => {
        if (signedIn) {
            signIn();
            mockApi({ 'GET /api/profile': () => ({ status: 200, body: profile() }) });
        }
        renderWithMemoryRoute(<AppFooter />);

        expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
        expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
        expect(screen.getByRole('link', { name: 'Refunds' })).toHaveAttribute('href', '/refunds');
        expect(screen.queryByRole('link', { name: 'Calendar' })).not.toBeInTheDocument();
    });
});
