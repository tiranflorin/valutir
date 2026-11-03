import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import AppFooter from '../components/AppFooter';
import PrivacyPage from '../pages/PrivacyPage';
import RefundPage from '../pages/RefundPage';
import TermsPage from '../pages/TermsPage';
import { renderWithMemoryRoute } from './test-utils';

const STORAGE_KEY = 'valutir_auth_token';
const fakeJwt = `header.${btoa(JSON.stringify({ username: 'ada@example.test', roles: ['ROLE_USER'], tv: 1 }))}.signature`;

describe('legal pages', () => {
    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
    });

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
            window.localStorage.setItem(STORAGE_KEY, fakeJwt);
            vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'not needed' }), { status: 500 })));
        }
        renderWithMemoryRoute(<AppFooter />);

        expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
        expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
        expect(screen.getByRole('link', { name: 'Refunds' })).toHaveAttribute('href', '/refunds');
        expect(screen.queryByRole('link', { name: 'Calendar' })).not.toBeInTheDocument();
    });
});
