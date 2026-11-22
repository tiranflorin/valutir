import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CATEGORIES } from '../data/categories';
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
            expect(CATEGORIES).toContain(service.category);
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
        expect(screen.getByText(/Filled in category AI tools, the manage or cancel link for GitHub Copilot/)).toBeInTheDocument();
        await save(user);

        expect(bodyOf(callsTo(calls, 'POST /api/subs')[0])).toMatchObject({
            serviceName: 'GitHub Copilot',
            category: 'AI tools',
            billingCadence: 'monthly',
            manageUrl: 'https://github.com/settings/copilot',
        });
    });

    it('never overwrites a cadence, category or link the user already chose', async () => {
        const calls = addApi();
        const user = userEvent.setup();
        renderAdd();

        await user.click(screen.getByRole('button', { name: 'Yearly' }));
        await user.click(screen.getByRole('combobox', { name: 'Category' }));
        await user.click(await screen.findByRole('option', { name: 'Cloud storage' }));
        fireEvent.change(screen.getByLabelText(/manage or cancel link/i), { target: { value: 'https://example.com/mine' } });
        await user.type(screen.getByRole('combobox', { name: /service name/i }), 'netfl');
        await user.click(await screen.findByRole('option', { name: /Netflix/ }));
        await save(user);

        expect(bodyOf(callsTo(calls, 'POST /api/subs')[0])).toMatchObject({
            serviceName: 'Netflix',
            category: 'Cloud storage',
            billingCadence: 'yearly',
            manageUrl: 'https://example.com/mine',
        });
    });

    it('replaces a filled-in link when another service is picked, and drops it for a typed name', async () => {
        const calls = addApi();
        const user = userEvent.setup();
        renderAdd();
        const name = screen.getByRole('combobox', { name: /service name/i });

        await user.type(name, 'netfl');
        await user.click(await screen.findByRole('option', { name: /Netflix/ }));
        await user.clear(name);
        await user.type(name, 'spotif');
        await user.click(await screen.findByRole('option', { name: /Spotify/ }));
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('https://www.spotify.com/account/overview/');

        // A service without a link clears the filled-in one.
        await user.clear(name);
        await user.type(name, 'hbo');
        await user.click(await screen.findByRole('option', { name: /HBO Max/ }));
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('');

        // Editing the name keeps the link while it still names the service, and drops it otherwise.
        await user.clear(name);
        await user.type(name, 'netfl');
        await user.click(await screen.findByRole('option', { name: /Netflix/ }));
        await user.type(name, ' Family');
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('https://www.netflix.com/account');
        await user.clear(name);
        await user.type(name, 'Local gym');
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('');
        await save(user);

        expect(bodyOf(callsTo(calls, 'POST /api/subs')[0])).toMatchObject({ serviceName: 'Local gym', manageUrl: null });
    }, 15_000); // Types into the form many times; slow when the whole suite runs in parallel.

    it('fills the same when an exact catalog name is typed and the suggestion is never clicked', async () => {
        const calls = addApi();
        const user = userEvent.setup();
        renderAdd();

        await user.type(screen.getByRole('combobox', { name: /service name/i }), 'netflix');
        await user.keyboard('{Escape}');
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('https://www.netflix.com/account');
        expect(screen.getByText(/the manage or cancel link for Netflix/)).toBeInTheDocument();
        await save(user);

        // The name stays as typed; only what the catalog knows is added.
        expect(bodyOf(callsTo(calls, 'POST /api/subs')[0])).toMatchObject({
            serviceName: 'netflix',
            category: 'Video streaming',
            manageUrl: 'https://www.netflix.com/account',
        });
    });

    it('fills from an alias without renaming what was typed', async () => {
        addApi();
        const user = userEvent.setup();
        renderAdd();
        const name = screen.getByRole('combobox', { name: /service name/i });

        await user.type(name, 'office 365');
        await user.keyboard('{Escape}');
        expect(name).toHaveValue('office 365');
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('https://account.microsoft.com/services');
    });

    it('keeps the link through a plan name typed after the service, and drops it for another name', async () => {
        addApi();
        const user = userEvent.setup();
        renderAdd();
        const name = screen.getByRole('combobox', { name: /service name/i });

        await user.type(name, 'Netflix Standard');
        await user.keyboard('{Escape}');
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('https://www.netflix.com/account');

        await user.clear(name);
        await user.type(name, 'Local cinema club');
        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('');
    });

    it('never replaces a link the user typed when a catalog name is typed', async () => {
        addApi();
        const user = userEvent.setup();
        renderAdd();

        fireEvent.change(screen.getByLabelText(/manage or cancel link/i), { target: { value: 'https://example.com/my-plan' } });
        await user.type(screen.getByRole('combobox', { name: /service name/i }), 'Spotify');

        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('https://example.com/my-plan');
    });

    it('keeps a typed link when the service changes', async () => {
        addApi();
        const user = userEvent.setup();
        renderAdd();
        const name = screen.getByRole('combobox', { name: /service name/i });

        await user.type(name, 'netfl');
        await user.click(await screen.findByRole('option', { name: /Netflix/ }));
        fireEvent.change(screen.getByLabelText(/manage or cancel link/i), { target: { value: 'https://example.com/family-plan' } });
        await user.clear(name);
        await user.type(name, 'spotif');
        await user.click(await screen.findByRole('option', { name: /Spotify/ }));

        expect(screen.getByLabelText(/manage or cancel link/i)).toHaveValue('https://example.com/family-plan');
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

    // The price and date fields, looked up in the Selected panel only: searching the whole
    // catalog list for each label is slow enough to time tests out on CI.
    const selected = () => within(screen.getByRole('region', { name: /^Selected/ }));

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
        await user.click(within(list).getByLabelText('Netflix'));
        await user.type(screen.getByRole('searchbox', { name: 'Search services' }), 'strava');
        await user.click(within(screen.getByRole('list', { name: 'Common services' })).getByLabelText('Strava'));

        await user.click(screen.getByRole('button', { name: 'Add 2 subscriptions' }));
        expect(screen.getByText('Enter the price and next charge date for Netflix.')).toBeInTheDocument();

        fireEvent.change(selected().getByLabelText('Netflix price'), { target: { value: '13.99' } });
        fireEvent.change(selected().getByLabelText('Netflix next charge'), { target: { value: inDays(5) } });
        fireEvent.change(selected().getByLabelText('Strava price'), { target: { value: '59.99' } });
        fireEvent.change(selected().getByLabelText('Strava next charge'), { target: { value: inDays(40) } });
        await user.click(screen.getByRole('button', { name: 'Add 2 subscriptions' }));

        expect(await screen.findByText('Dashboard')).toBeInTheDocument();
        const bodies = callsTo(calls, 'POST /api/subs').map(bodyOf);
        expect(bodies).toHaveLength(2);
        expect(bodies[0]).toMatchObject({
            serviceName: 'Netflix', amount: 13.99, currency: 'EUR', billingCadence: 'monthly', category: 'Video streaming',
            status: 'active', nextBillingDate: inDays(5), manageUrl: 'https://www.netflix.com/account', b2b: false,
            householdShared: false, householdSize: null, resumesOn: null,
        });
        expect(bodies[1]).toMatchObject({ serviceName: 'Strava', amount: 59.99, billingCadence: 'yearly', category: 'Health & fitness' });
    });

    it('locks the selection while saving, and keeps an unsaved pick by name when one fails', async () => {
        let release: (() => void) | undefined;
        const firstSaved = new Promise<void>((resolve) => { release = resolve; });
        let posts = 0;
        vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit = {}) => {
            const path = new URL(String(input), 'http://api.test').pathname;
            if (path === '/api/profile') return new Response(JSON.stringify(profile()), { status: 200 });
            if (init.method === 'POST' && ++posts === 1) {
                await firstSaved;
                return new Response(JSON.stringify({ id: 1 }), { status: 201 });
            }
            return new Response(JSON.stringify({ message: 'Server down.' }), { status: 500 });
        }));
        const user = userEvent.setup();
        renderWithMemoryRoute(<PickServicesPage />, { route: '/subscriptions/pick' });

        const list = screen.getByRole('list', { name: 'Common services' });
        for (const name of ['Netflix', 'Spotify']) {
            await user.click(within(list).getByLabelText(name));
            fireEvent.change(selected().getByLabelText(`${name} price`), { target: { value: '9.99' } });
            fireEvent.change(selected().getByLabelText(`${name} next charge`), { target: { value: inDays(5) } });
        }
        await user.click(screen.getByRole('button', { name: 'Add 2 subscriptions' }));

        // Netflix is still saving: nothing can be unticked or changed.
        expect(await screen.findByRole('button', { name: 'Adding...' })).toBeDisabled();
        expect(within(list).getByLabelText('Netflix')).toBeDisabled();
        expect(selected().getByLabelText('Spotify price')).toBeDisabled();

        release?.();
        expect(await screen.findByText('Added 1 of 2. Server down.')).toBeInTheDocument();
        expect(within(list).getByLabelText('Netflix')).not.toBeChecked();
        expect(within(list).getByLabelText('Spotify')).toBeChecked();
        expect(selected().getByLabelText('Spotify price')).toHaveValue(9.99);
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
            await user.click(within(list).getByLabelText(name));
            fireEvent.change(selected().getByLabelText(`${name} price`), { target: { value: '9.99' } });
            fireEvent.change(selected().getByLabelText(`${name} next charge`), { target: { value: inDays(5) } });
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
                status: 'active', startedAt: '2026-01-01', nextBillingDate: '2099-01-15', notes: null, manageUrl,
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

        const link = await screen.findByRole('link', { name: /Manage or cancel with the provider/ });
        expect(link).toHaveAttribute('href', 'https://www.netflix.com/account');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        // The provider's site is outside our control, so every link says it can go out of date.
        expect(screen.getByText(/Providers change their pages, so this link can stop working/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
        const cancelLink = screen.getByRole('link', { name: /Cancel with Netflix/ });
        expect(cancelLink).toHaveAttribute('href', 'https://www.netflix.com/account');
        expect(cancelLink.closest('.manage-link-block')).toHaveTextContent(/this link can stop working/);
    });

    it('never links a stored value that isn’t https', async () => {
        detail('javascript:alert(1)');

        await screen.findByRole('button', { name: 'Edit subscription' });
        expect(screen.queryByRole('link', { name: /Manage or cancel with the provider/ })).not.toBeInTheDocument();
        expect(screen.queryByText(/this link can stop working/)).not.toBeInTheDocument();
    });
});
