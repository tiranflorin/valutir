import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import AddSubscriptionPage from '../pages/AddSubscriptionPage';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import PickServicesPage from '../pages/PickServicesPage';
import SubscriptionDetailPage from '../pages/SubscriptionDetailPage';
import { findCatalogService, SERVICE_CATALOG, searchCatalog } from '../data/services';
import { todayIsoDate } from '../utils/dates';
import { manageUrlError, safeManageUrl } from '../utils/manageUrl';
import { bodyOf, callsTo, mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const FORM_CATEGORIES = ['Entertainment', 'Software', 'Fitness', 'Banking', 'Utilities', 'Cloud', 'Other'];

const inDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return todayIsoDate(date);
};

describe('service catalog', () => {
    it('has unique names, the form’s categories and only valid https manage links', () => {
        const names = SERVICE_CATALOG.map(({ name }) => name.toLowerCase());
        expect(new Set(names).size).toBe(names.length);
        SERVICE_CATALOG.forEach((service) => {
            expect(FORM_CATEGORIES).toContain(service.category);
            if (service.manageUrl) expect(manageUrlError(service.manageUrl)).toBeNull();
        });
    });

    it('finds services by name or alias, names starting with the query first', () => {
        expect(findCatalogService('office 365')?.name).toBe('Microsoft 365');
        expect(searchCatalog('git').map(({ name }) => name).slice(0, 2)).toEqual(['GitHub', 'GitHub Copilot']);
        expect(searchCatalog('zzz')).toEqual([]);
    });
});

describe('manage link checks', () => {
    it('accepts an https link with a domain, or nothing', () => {
        expect(manageUrlError('')).toBeNull();
        expect(manageUrlError('https://www.netflix.com/account')).toBeNull();
    });

    it('rejects http, javascript:, links without a domain and overlong ones', () => {
        expect(manageUrlError('http://www.netflix.com/account')).not.toBeNull();
        expect(manageUrlError('javascript:alert(1)')).not.toBeNull();
        expect(manageUrlError('https://localhost/x')).not.toBeNull();
        expect(manageUrlError(`https://example.com/${'a'.repeat(2048)}`)).not.toBeNull();
        expect(safeManageUrl('javascript:alert(1)')).toBeNull();
    });
});

describe('adding a subscription from the catalog', () => {
    beforeEach(() => {
        signIn();
    });

    const addApi = () => mockApi({
        'GET /api/profile': () => ({ status: 200, body: profile() }),
        'POST /api/subs': ({ init }) => ({ status: 201, body: { id: 9, ...JSON.parse(String(init.body)) } }),
    });

    const renderAdd = () => renderWithMemoryRoute(
        <Routes>
            <Route path="/subscriptions/new" element={<AddSubscriptionPage />} />
            <Route path="/my-subs" element={<p>Dashboard</p>} />
        </Routes>,
        { route: '/subscriptions/new' },
    );

    const save = async (user: ReturnType<typeof userEvent.setup>) => {
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '4.00' } });
        fireEvent.change(screen.getByLabelText(/next billing date/i), { target: { value: inDays(10) } });
        await user.click(screen.getByRole('button', { name: 'Save subscription' }));
        await screen.findByText('Dashboard');
    };

    it('fills the category, cadence and manage link from the picked service', async () => {
        const calls = addApi();
        const user = userEvent.setup();
        renderAdd();

        await user.type(screen.getByRole('combobox', { name: /service name/i }), 'copil');
        await user.click(await screen.findByRole('option', { name: /GitHub Copilot/ }));
        expect(screen.getByText(/Filled in category Software, the manage or cancel link for GitHub Copilot/)).toBeInTheDocument();
        await save(user);

        expect(bodyOf(callsTo(calls, 'POST /api/subs')[0])).toMatchObject({
            serviceName: 'GitHub Copilot',
            category: 'Software',
            billingCadence: 'monthly',
            manageUrl: 'https://github.com/settings/copilot',
        });
    });

    it('never overwrites a cadence, category or link the user already chose', async () => {
        const calls = addApi();
        const user = userEvent.setup();
        renderAdd();

        await user.click(screen.getByRole('button', { name: 'Yearly' }));
        await user.click(screen.getByRole('button', { name: 'Cloud' }));
        fireEvent.change(screen.getByLabelText(/manage or cancel link/i), { target: { value: 'https://example.com/mine' } });
        await user.type(screen.getByRole('combobox', { name: /service name/i }), 'netfl');
        await user.click(await screen.findByRole('option', { name: /Netflix/ }));
        await save(user);

        expect(bodyOf(callsTo(calls, 'POST /api/subs')[0])).toMatchObject({
            serviceName: 'Netflix',
            category: 'Cloud',
            billingCadence: 'yearly',
            manageUrl: 'https://example.com/mine',
        });
    });

    it('stops an http manage link before sending anything', async () => {
        const calls = addApi();
        const user = userEvent.setup();
        renderAdd();

        await user.type(screen.getByRole('combobox', { name: /service name/i }), 'My plan');
        fireEvent.change(screen.getByLabelText(/manage or cancel link/i), { target: { value: 'http://example.com' } });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '4.00' } });
        fireEvent.change(screen.getByLabelText(/next billing date/i), { target: { value: inDays(10) } });
        await user.click(screen.getByRole('button', { name: 'Save subscription' }));

        expect(await screen.findByText(/Manage or cancel link: Use a full https:\/\/ link/)).toBeInTheDocument();
        expect(callsTo(calls, 'POST /api/subs')).toHaveLength(0);
    });
});

describe('Pick what you pay for', () => {
    beforeEach(() => {
        signIn();
    });

    it('is offered on an empty dashboard', async () => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs': () => ({ status: 200, body: [] }),
        });
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        expect(await screen.findByRole('link', { name: 'Pick what you pay for' })).toHaveAttribute('href', '/subscriptions/pick');
    });

    it('adds every picked service with its price, cadence, date and manage link', async () => {
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'POST /api/subs': ({ init }) => ({ status: 201, body: { id: 1, ...JSON.parse(String(init.body)) } }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(
            <Routes>
                <Route path="/subscriptions/pick" element={<PickServicesPage />} />
                <Route path="/my-subs" element={<p>Dashboard</p>} />
            </Routes>,
            { route: '/subscriptions/pick' },
        );

        const list = screen.getByRole('list', { name: 'Common services' });
        await user.click(within(list).getByRole('checkbox', { name: 'Netflix' }));
        await user.type(screen.getByRole('searchbox', { name: 'Search services' }), 'strava');
        await user.click(within(screen.getByRole('list', { name: 'Common services' })).getByRole('checkbox', { name: 'Strava' }));

        await user.click(screen.getByRole('button', { name: 'Add 2 subscriptions' }));
        expect(screen.getByText('Enter the price and next charge date for Netflix.')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Netflix price'), { target: { value: '13.99' } });
        fireEvent.change(screen.getByLabelText('Netflix next charge'), { target: { value: inDays(5) } });
        fireEvent.change(screen.getByLabelText('Strava price'), { target: { value: '59.99' } });
        fireEvent.change(screen.getByLabelText('Strava next charge'), { target: { value: inDays(40) } });
        await user.click(screen.getByRole('button', { name: 'Add 2 subscriptions' }));

        expect(await screen.findByText('Dashboard')).toBeInTheDocument();
        const bodies = callsTo(calls, 'POST /api/subs').map(bodyOf);
        expect(bodies).toHaveLength(2);
        expect(bodies[0]).toMatchObject({
            serviceName: 'Netflix', amount: 13.99, currency: 'EUR', billingCadence: 'monthly', category: 'Entertainment',
            status: 'active', nextBillingDate: inDays(5), manageUrl: 'https://www.netflix.com/account', b2b: false,
            householdShared: false, householdSize: null, resumesOn: null,
        });
        expect(bodies[1]).toMatchObject({ serviceName: 'Strava', amount: 59.99, billingCadence: 'yearly', category: 'Fitness' });
    });

    it('stops at the free-plan limit and keeps only the ones not yet added', async () => {
        let posts = 0;
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'POST /api/subs': () => (++posts === 1
                ? { status: 201, body: { id: 1 } }
                : { status: 402, body: { message: 'The free plan tracks up to 50 active subscriptions.' } }),
        });
        const user = userEvent.setup();
        renderWithMemoryRoute(<PickServicesPage />, { route: '/subscriptions/pick' });

        const list = screen.getByRole('list', { name: 'Common services' });
        for (const name of ['Netflix', 'Spotify']) {
            await user.click(within(list).getByRole('checkbox', { name }));
            fireEvent.change(screen.getByLabelText(`${name} price`), { target: { value: '9.99' } });
            fireEvent.change(screen.getByLabelText(`${name} next charge`), { target: { value: inDays(5) } });
        }
        await user.click(screen.getByRole('button', { name: 'Add 2 subscriptions' }));

        expect(await screen.findByText('Added 1 of 2. The free plan tracks up to 50 active subscriptions.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Selected · 1' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Spotify' })).toBeInTheDocument();
    });
});

describe('manage link on the detail page', () => {
    beforeEach(() => {
        signIn();
    });

    const detail = (manageUrl: string | null) => {
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs/1': () => ({ status: 200, body: {
                id: 1, serviceName: 'Netflix', amount: '13.99', currency: 'EUR', billingCadence: 'monthly', category: 'Entertainment',
                status: 'active', startedAt: '2026-01-01', nextBillingDate: '2099-01-15', notes: null, paymentMethod: null, manageUrl,
                autoRenew: true, b2b: false, householdShared: false, householdSize: null, cancelledAt: null, trialEndsAt: null,
                resumesOn: null, reviewFlagged: false, reviewFlaggedAt: null, reviewNote: null,
            } }),
        });
        renderWithMemoryRoute(
            <Routes><Route path="/subscriptions/:subscriptionId" element={<SubscriptionDetailPage />} /></Routes>,
            { route: '/subscriptions/1' },
        );
    };

    it('links to the provider in a new tab, and from the cancel step', async () => {
        detail('https://www.netflix.com/account');
        const user = userEvent.setup();

        const link = await screen.findByRole('link', { name: /Manage or cancel/ });
        expect(link).toHaveAttribute('href', 'https://www.netflix.com/account');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');

        await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
        expect(screen.getByRole('link', { name: /Cancel with Netflix/ })).toHaveAttribute('href', 'https://www.netflix.com/account');
    });

    it('never links a stored value that isn’t https', async () => {
        detail('javascript:alert(1)');

        await screen.findByRole('button', { name: 'Edit subscription' });
        expect(screen.queryByRole('link', { name: /Manage or cancel/ })).not.toBeInTheDocument();
    });
});
