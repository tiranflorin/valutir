import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import { mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const subscription = (id: number, serviceName: string, status: string, extra: Record<string, unknown> = {}) => ({
    id,
    serviceName,
    amount: '9.99',
    currency: 'EUR',
    billingCadence: 'monthly',
    category: 'Streaming',
    status,
    startedAt: '2026-01-01',
    nextBillingDate: '2027-01-15',
    cancelledAt: null,
    trialEndsAt: null,
    trialReminderSentAt: null,
    b2b: false,
    autoRenew: true,
    ...extra,
});

const subscriptions = [
    subscription(1, 'Netflix', 'active'),
    subscription(2, 'Spotify', 'active'),
    subscription(3, 'Old Hosting', 'cancelled', { cancelledAt: '2026-10-01', autoRenew: false }),
];

const dashboardApi = (items: unknown[]) => mockApi({
    'GET /api/profile': () => ({ status: 200, body: profile() }),
    'GET /api/subs': () => ({ status: 200, body: items }),
});

/** The rows of the table that follows the section label with the given text. */
const rowsUnder = (label: RegExp) => {
    const heading = screen.getByText(label);
    const table = heading.closest('.list-labels')!.nextElementSibling as HTMLElement;
    return within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
};

describe('MySubscriptionsPage sections', () => {
    beforeEach(() => {
        signIn();
    });

    it('lists cancelled subscriptions in their own section after My subscriptions', async () => {
        dashboardApi(subscriptions);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        const mySection = await screen.findByText('My subscriptions · 2');
        const cancelledSection = screen.getByText('Cancelled · 1');

        expect(rowsUnder(/^My subscriptions/)).toEqual(['Netflix', 'Spotify']);
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
        expect(mySection.compareDocumentPosition(cancelledSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByText(/other subscriptions/i)).not.toBeInTheDocument();
    });

    it('shows only the cancelled section when the Cancelled filter is selected', async () => {
        dashboardApi(subscriptions);
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await user.click(await screen.findByRole('button', { name: 'Cancelled 1' }));

        expect(screen.queryByText(/^My subscriptions/)).not.toBeInTheDocument();
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
    });

    it('splits the business view the same way', async () => {
        window.localStorage.setItem('valutir_dashboard_view', 'business');
        dashboardApi(subscriptions.map((item) => ({ ...item, b2b: true })));
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(await screen.findByRole('heading', { name: 'Business subscriptions' })).toBeInTheDocument();
        await screen.findByText('My subscriptions · 2');
        expect(rowsUnder(/^My subscriptions/)).toEqual(['Netflix', 'Spotify']);
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);
    });
});

/** A YYYY-MM-DD date `days` from today, local time. */
const daysFromToday = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

describe('MySubscriptionsPage this month', () => {
    beforeEach(() => {
        signIn();
    });

    it('shows this month’s charges with what is left to pay', async () => {
        // Due today, so it is in this month and still to pay whatever the date.
        dashboardApi([subscription(1, 'Netflix', 'active', { nextBillingDate: daysFromToday(0), startedAt: daysFromToday(0) })]);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        const card = (await screen.findByRole('heading', { name: /^This month ·/ })).closest('section') as HTMLElement;
        const list = within(card).getByRole('list', { name: /^Charges in/ });

        expect(within(list).getAllByRole('listitem')).toHaveLength(1);
        expect(within(list).getByText('Today')).toBeInTheDocument();
        expect(within(card).getByTestId('month-left')).toHaveTextContent('€9.99');
        expect(within(card).getByTestId('month-paid')).toHaveTextContent('€0.00');
        expect(within(card).getByRole('img', { name: '0 of 1 charges this month have gone out' })).toBeInTheDocument();
    });

    it('notes how many days away a later renewal is', async () => {
        dashboardApi([subscription(1, 'Netflix', 'active', { nextBillingDate: daysFromToday(20) })]);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(await screen.findByText('in 20 days')).toBeInTheDocument();
    });
});

describe('MySubscriptionsPage search', () => {
    beforeEach(() => {
        signIn();
    });

    const items = [
        subscription(1, 'Netflix', 'active'),
        subscription(2, 'Spotify', 'active', { category: 'Music' }),
        subscription(3, 'GitHub', 'active', { category: 'Developer tools', notes: 'Copilot seat' }),
        subscription(4, 'Old Hosting', 'cancelled', { cancelledAt: '2026-10-01', autoRenew: false, category: 'Developer tools' }),
    ];

    it('narrows both sections to subscriptions whose name, category or notes match', async () => {
        dashboardApi(items);
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        const search = await screen.findByRole('searchbox', { name: 'Search subscriptions' });
        await screen.findByText('My subscriptions · 3');

        await user.type(search, 'copilot');
        expect(rowsUnder(/^My subscriptions/)).toEqual(['GitHub']);
        expect(screen.queryByText(/^Cancelled ·/)).not.toBeInTheDocument();

        await user.clear(search);
        await user.type(search, 'developer');
        expect(rowsUnder(/^My subscriptions/)).toEqual(['GitHub']);
        expect(rowsUnder(/^Cancelled ·/)).toEqual(['Old Hosting']);

        await user.clear(search);
        await user.type(search, 'nothing like this');
        expect(screen.getByText('No subscriptions match this filter.')).toBeInTheDocument();
    });

    it('filters by category', async () => {
        dashboardApi(items);
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await screen.findByText('My subscriptions · 3');
        await user.click(screen.getByRole('combobox', { name: 'Category' }));
        await user.click(screen.getByRole('option', { name: 'Music' }));

        expect(rowsUnder(/^My subscriptions/)).toEqual(['Spotify']);
        expect(screen.queryByText(/^Cancelled ·/)).not.toBeInTheDocument();
    });
});

describe('MySubscriptionsPage needs attention', () => {
    beforeEach(() => {
        signIn();
    });

    const attentionRows = () => {
        const card = screen.getByRole('heading', { name: /^Needs attention ·/ }).closest('section') as HTMLElement;
        return Array.from(card.querySelectorAll('.attention-row')).map((row) => [
            row.querySelector('.attention-name')?.textContent,
            row.querySelector('.attention-meta')?.textContent,
        ]);
    };

    it('lists trials ending and renewals in the next 7 days together, trials first', async () => {
        dashboardApi([
            subscription(1, 'Netflix', 'active', { nextBillingDate: daysFromToday(3) }),
            subscription(2, 'Spotify', 'trial', { trialEndsAt: daysFromToday(1), nextBillingDate: daysFromToday(1) }),
            subscription(3, 'Later', 'active', { nextBillingDate: daysFromToday(20) }),
        ]);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(await screen.findByRole('heading', { name: 'Needs attention · 2' })).toBeInTheDocument();
        expect(attentionRows()).toEqual([
            ['Spotify', 'TRIAL ENDS · Tomorrow'],
            ['Netflix', 'RENEWS · In 3 days'],
        ]);
    });

    it('hides the block and the old figure cards when nothing needs attention', async () => {
        dashboardApi(subscriptions);
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await screen.findByText('My subscriptions · 2');
        expect(screen.queryByRole('heading', { name: /^Needs attention/ })).not.toBeInTheDocument();
        expect(screen.queryByText('Tracked recurring bills')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'See insights →' })).toHaveAttribute('href', '/insights');
    });

    it('offers Needs review instead of Shared in the business view', async () => {
        window.localStorage.setItem('valutir_dashboard_view', 'business');
        dashboardApi([...subscriptions, subscription(4, 'Mystery', 'other')].map((item) => ({ ...item, b2b: true })));
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await user.click(await screen.findByRole('button', { name: 'Needs review 1' }));
        expect(screen.queryByRole('button', { name: /^Shared/ })).not.toBeInTheDocument();
        expect(rowsUnder(/^My subscriptions/)).toEqual(['Mystery']);
    });
});
