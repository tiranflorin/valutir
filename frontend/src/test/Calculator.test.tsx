import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../App';
import { CALCULATOR_PRESETS } from '../data/calculatorPresets';
import { SERVICE_CATALOG } from '../data/services';
import { INDEXED_PAGES } from '../seo/pages';
import {
    type CalculatorImport,
    type CalculatorRow,
    calculatorTotals,
    importFromRows,
    readSharedResult,
    shareFragment,
    CALCULATOR_IMPORT_MAX_ROWS,
    validCalculatorImport,
} from '../utils/calculator';
import {
    CALCULATOR_LIST_KEY,
    CALCULATOR_LIST_MAX_AGE_MS,
    keepCalculatorList,
    monthAfter,
    pendingCalculatorList,
} from '../services/calculatorList';
import { todayIsoDate } from '../utils/dates';
import { bodyOf, callsTo, fakeJwt, mockApi, profile, signIn } from './api';

type Entry = string | { pathname: string; hash?: string; state?: unknown };
const renderApp = (entry: Entry) => render(<MemoryRouter initialEntries={[entry]}><App /></MemoryRouter>);

const row = (overrides: Partial<CalculatorRow>): CalculatorRow =>
    ({ name: 'Netflix', category: 'Entertainment', amount: '10', cadence: 'monthly', included: true, ...overrides });

afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
});

describe('calculator totals', () => {
    it('counts each cadence over a year, and a month as the yearly total / 12', () => {
        const totals = calculatorTotals([
            row({ name: 'A', amount: '1', cadence: 'weekly' }),
            row({ name: 'B', amount: '10', cadence: 'monthly', category: 'Software' }),
            row({ name: 'C', amount: '30', cadence: 'quarterly', category: 'Software' }),
            row({ name: 'D', amount: '100', cadence: 'yearly', category: 'Cloud' }),
        ]);
        expect(totals.yearly).toBeCloseTo(52 + 120 + 120 + 100);
        expect(totals.monthly).toBeCloseTo(392 / 12);
        expect(totals.fiveYears).toBeCloseTo(1960);
        expect(totals.count).toBe(4);
        expect(totals.categories.map(({ category }) => category)).toEqual(['Software', 'Cloud', 'Entertainment']);
        expect(totals.categories[0].share).toBeCloseTo(240 / 392);
    });

    it('leaves unticked rows out and reports what dropping them frees up', () => {
        const totals = calculatorTotals([row({ name: 'A' }), row({ name: 'B', amount: '5', included: false })]);
        expect(totals.yearly).toBeCloseTo(120);
        expect(totals.droppedYearly).toBeCloseTo(60);
        expect(totals.droppedCount).toBe(1);
    });

    it('ignores empty, negative, non-numeric and absurd prices', () => {
        const totals = calculatorTotals(['', '-4', 'abc', '1e9'].map((amount, index) => row({ name: String(index), amount })));
        expect(totals).toMatchObject({ yearly: 0, count: 0, categories: [] });
    });
});

describe('shared result links', () => {
    it('round-trips the totals and nothing else', () => {
        const fragment = shareFragment({ yearly: 756.4, count: 6, currency: 'EUR', topCategory: 'Entertainment' });
        expect(fragment).toBe('y=756.40&n=6&c=EUR&t=Entertainment');
        expect(readSharedResult(`#${fragment}`)).toEqual({ yearly: 756.4, count: 6, currency: 'EUR', topCategory: 'Entertainment' });
    });

    it('reads links with the current categories, and with the older ones shared before', () => {
        const fragment = shareFragment({ yearly: 120, count: 2, currency: 'EUR', topCategory: 'Music & audiobooks' });
        expect(readSharedResult(`#${fragment}`)?.topCategory).toBe('Music & audiobooks');
        // "Entertainment" was a category until 18 November 2026; links from then still open.
        expect(readSharedResult('#y=120.00&n=2&c=EUR&t=Entertainment')?.topCategory).toBe('Entertainment');
        expect(readSharedResult('#y=120.00&n=2&c=EUR&t=Streaming')).toBeNull();
    });

    it.each([
        '',
        '#y=-1&n=2&c=EUR',
        '#y=100&n=0&c=EUR',
        '#y=100&n=2.5&c=EUR',
        '#y=100&n=2&c=GBP',
        '#y=100&n=2&c=EUR&t=<script>',
        '#y=abc&n=2&c=EUR',
    ])('rejects %s', (hash) => {
        expect(readSharedResult(hash)).toBeNull();
    });
});

describe('the list kept for an account', () => {
    it('takes only ticked rows with a price, with the price cleaned up', () => {
        const imported = importFromRows([row({ amount: '9.990' }), row({ name: 'B', amount: '' }), row({ name: 'C', included: false })], 'USD');
        expect(imported).toEqual({ currency: 'USD', rows: [{ name: 'Netflix', category: 'Entertainment', amount: '9.99', cadence: 'monthly' }] });
    });

    it('accepts only a well-formed list', () => {
        const good = { name: 'Netflix', category: 'Entertainment', amount: '9.99', cadence: 'monthly' };
        expect(validCalculatorImport({ currency: 'EUR', rows: [good] })).toEqual({ currency: 'EUR', rows: [good] });
        expect(validCalculatorImport(null)).toBeNull();
        expect(validCalculatorImport({ currency: 'GBP', rows: [good] })).toBeNull();
        expect(validCalculatorImport({ currency: 'EUR', rows: [] })).toBeNull();
        expect(validCalculatorImport({ currency: 'EUR', rows: [{ ...good, amount: '-1' }] })).toBeNull();
        expect(validCalculatorImport({ currency: 'EUR', rows: [{ ...good, cadence: 'daily' }] })).toBeNull();
        expect(validCalculatorImport({ currency: 'EUR', rows: [{ ...good, category: '<b>' }] })).toBeNull();
        expect(validCalculatorImport({ currency: 'EUR', rows: Array.from({ length: CALCULATOR_IMPORT_MAX_ROWS + 1 }, (_, i) => ({ ...good, name: `S${i}` })) })).toBeNull();
    });

    it('sets the next charge a month on, clamped to the end of a shorter month', () => {
        expect(monthAfter('2026-11-14')).toBe('2026-12-14');
        expect(monthAfter('2026-12-31')).toBe('2027-01-31');
        expect(monthAfter('2027-01-31')).toBe('2027-02-28');
        expect(monthAfter('2028-01-30')).toBe('2028-02-29');
    });

    it('forgets a list after 7 days, or one that is damaged', () => {
        keepCalculatorList({ currency: 'EUR', rows: [{ name: 'Netflix', category: 'Entertainment', amount: '9.99', cadence: 'monthly' }] }, 1000);
        expect(pendingCalculatorList(1000 + CALCULATOR_LIST_MAX_AGE_MS)).not.toBeNull();
        expect(pendingCalculatorList(1001 + CALCULATOR_LIST_MAX_AGE_MS)).toBeNull();
        expect(window.localStorage.getItem(CALCULATOR_LIST_KEY)).toBeNull();

        window.localStorage.setItem(CALCULATOR_LIST_KEY, '{not json');
        expect(pendingCalculatorList()).toBeNull();
        expect(window.localStorage.getItem(CALCULATOR_LIST_KEY)).toBeNull();
    });
});

describe('calculator pages', () => {
    it('lists only catalog services as suggestions, and every page is indexed', () => {
        const names = SERVICE_CATALOG.map(({ name }) => name);
        Object.values(CALCULATOR_PRESETS).forEach((preset) => {
            preset.suggested.forEach((name) => expect(names, `${preset.path}: ${name}`).toContain(name));
            expect(INDEXED_PAGES.map(({ path }) => path)).toContain(preset.path);
        });
    });

    it('adds up ticked services and your own, and shows what unticking frees up', async () => {
        const user = userEvent.setup();
        renderApp('/calculator');

        await user.click(screen.getByRole('checkbox', { name: 'Netflix' }));
        await user.type(screen.getByLabelText('Netflix price'), '10');
        await user.type(screen.getByLabelText('Something else'), 'Local gym');
        await user.click(screen.getByRole('button', { name: 'Add' }));
        await user.type(screen.getByLabelText('Local gym price'), '30');

        expect(screen.getByTestId('calculator-yearly')).toHaveTextContent('€480.00');
        expect(screen.getByTestId('calculator-monthly')).toHaveTextContent('€40.00');
        expect(screen.getByTestId('calculator-five-years')).toHaveTextContent('€2,400.00');
        expect(screen.getByLabelText('Local gym category')).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: 'Count Local gym' }));
        expect(screen.getByTestId('calculator-yearly')).toHaveTextContent('€120.00');
        expect(screen.getByTestId('calculator-dropped')).toHaveTextContent('€360.00');
    });

    it('copies a link that carries the totals but no service names', async () => {
        // user-event provides the clipboard in tests.
        const user = userEvent.setup();
        renderApp('/streaming-cost-calculator');

        await user.click(screen.getByRole('checkbox', { name: 'Netflix' }));
        await user.type(screen.getByLabelText('Netflix price'), '10');
        await user.click(screen.getByRole('button', { name: 'Copy link' }));

        const link = await navigator.clipboard.readText();
        expect(screen.getByText(/link copied/i)).toBeInTheDocument();
        expect(link).toMatch(/\/calculator#y=120\.00&n=1&c=EUR&t=Video\+streaming$/);
        expect(link).not.toContain('Netflix');
    });

    it('shows a shared result above an empty calculator', () => {
        renderApp({ pathname: '/calculator', hash: '#y=756.00&n=6&c=EUR' });
        expect(screen.getByRole('status')).toHaveTextContent('€756.00 a year on 6 subscriptions');
        expect(screen.getByTestId('calculator-yearly')).toHaveTextContent('€0.00');
    });

    it('sends a signed-out visitor to sign up with the list', async () => {
        const user = userEvent.setup();
        renderApp('/calculator');

        await user.click(screen.getByRole('checkbox', { name: 'Spotify' }));
        await user.type(screen.getByLabelText('Spotify price'), '11');
        await user.click(screen.getByRole('button', { name: 'Save it free' }));

        expect(await screen.findByRole('heading', { name: 'Create account' })).toBeInTheDocument();
        expect(pendingCalculatorList()).toEqual({ currency: 'EUR', rows: [{ name: 'Spotify', category: 'Music & audiobooks', amount: '11', cadence: 'monthly' }] });
    });
});

describe('saving the calculator list', () => {
    const list: CalculatorImport = {
        currency: 'USD',
        rows: [
            { name: 'Netflix', category: 'Entertainment', amount: '9.99', cadence: 'monthly' },
            { name: 'Spotify', category: 'Entertainment', amount: '11.99', cadence: 'monthly' },
            { name: 'Local gym', category: 'Fitness', amount: '30', cadence: 'monthly' },
        ],
    };
    const nextMonth = () => monthAfter(todayIsoDate());

    // The case that lost the list before: sign-up in one tab, confirmation email and sign-in in
    // another. Only the browser storage is shared, so the sign-in starts with no router state at all.
    it('adds the kept list on the first sign-in, in any tab, a month from today, skipping what is already there', async () => {
        keepCalculatorList(list);
        const calls = mockApi({
            'POST /api/login_check': () => ({ status: 200, body: { token: fakeJwt() } }),
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            // A complete record, as the API sends it: the dashboard renders it after saving.
            'GET /api/subs': () => ({ status: 200, body: [{
                id: 1, serviceName: 'spotify', status: 'active', amount: '11.99', currency: 'USD', billingCadence: 'monthly',
                category: 'Entertainment', startedAt: '2026-01-01', nextBillingDate: '2030-01-15', cancelledAt: null, trialEndsAt: null,
                b2b: false, autoRenew: true, householdShared: false, householdSize: null, reviewFlagged: false, manageUrl: null,
            }] }),
            'POST /api/subs': () => ({ status: 201, body: {} }),
        });
        const user = userEvent.setup();
        renderApp('/login');

        await user.type(screen.getByLabelText(/email address/i), 'ada@example.test');
        await user.type(screen.getByLabelText(/^password/i), 'Str0ng-pass');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        const notice = await screen.findByTestId('calculator-saved');
        expect(notice).toHaveTextContent('Added 2 subscriptions from the calculator: Netflix and Local gym.');
        expect(notice).toHaveTextContent('Already in your list, so not added again: Spotify.');
        const [netflix, gym] = callsTo(calls, 'POST /api/subs').map(bodyOf);
        expect(callsTo(calls, 'POST /api/subs')).toHaveLength(2);
        expect(netflix).toMatchObject({ serviceName: 'Netflix', amount: 9.99, currency: 'USD', status: 'active', nextBillingDate: nextMonth(), manageUrl: 'https://www.netflix.com/account', b2b: false });
        expect(gym).toMatchObject({ serviceName: 'Local gym', amount: 30, category: 'Fitness', nextBillingDate: nextMonth(), manageUrl: null });
        expect(window.localStorage.getItem(CALCULATOR_LIST_KEY)).toBeNull();
    });

    it('saves straight away for someone already signed in', async () => {
        signIn();
        const calls = mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs': () => ({ status: 200, body: [] }),
            'POST /api/subs': () => ({ status: 201, body: {} }),
        });
        const user = userEvent.setup();
        renderApp('/calculator');

        await user.click(screen.getByRole('checkbox', { name: 'Netflix' }));
        await user.type(screen.getByLabelText('Netflix price'), '10');
        await user.click(screen.getByRole('button', { name: 'Add these 1 to my subscriptions' }));

        expect(await screen.findByTestId('calculator-saved')).toHaveTextContent('Added 1 subscription from the calculator: Netflix.');
        expect(bodyOf(callsTo(calls, 'POST /api/subs')[0])).toMatchObject({ serviceName: 'Netflix', amount: 10, currency: 'EUR' });
    });

    it('stops at the free-plan limit and says which were not added', async () => {
        signIn();
        let posts = 0;
        mockApi({
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'GET /api/subs': () => ({ status: 200, body: [] }),
            'POST /api/subs': () => (++posts === 1 ? { status: 201, body: {} } : { status: 402, body: { message: 'The free plan includes up to 40 active subscriptions.' } }),
        });
        keepCalculatorList(list);
        renderApp('/my-subs');

        expect(await screen.findByTestId('calculator-saved')).toHaveTextContent('Added 1 subscription from the calculator: Netflix.');
        expect(await screen.findByText(/couldn’t add Spotify and Local gym from the calculator: the free plan includes up to 40/i)).toBeInTheDocument();
        expect(posts).toBe(2);
    });

    it('tells a new account on the sign-up page that the list is added when they sign in', async () => {
        keepCalculatorList(list);
        mockApi({ 'POST /api/register': () => ({ status: 202, body: { message: 'Registration received.' } }) });
        const user = userEvent.setup();
        renderApp('/register');

        await user.type(screen.getByLabelText('Full name'), 'Ada');
        await user.type(screen.getByLabelText(/email address/i), 'ada@example.test');
        await user.type(screen.getByLabelText(/^password/i), 'Str0ng-pass!x');
        await user.type(screen.getByLabelText(/confirm password/i), 'Str0ng-pass!x');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        expect(await screen.findByText(/when you sign in, in this browser, the 3 subscriptions from the calculator are added/i)).toBeInTheDocument();
        expect(window.localStorage.getItem(CALCULATOR_LIST_KEY)).not.toBeNull();
    });

    // Regression: the /login route used to send any signed-in visitor to /my-subs, which in a browser
    // won the race against the sign-in page's own redirect.
    it('sends a signed-in visitor on the sign-in page back to the page they asked for', async () => {
        signIn();
        mockApi({ 'GET /api/profile': () => ({ status: 200, body: profile() }), 'GET /api/subs': () => ({ status: 200, body: [] }) });
        renderApp({ pathname: '/login', state: { from: { pathname: '/insights' } } });

        expect(await screen.findByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument();
    });
});

describe('home page', () => {
    it('totals the quick picks and takes them to the full calculator', async () => {
        const user = userEvent.setup();
        renderApp('/');

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What you pay for, and when it charges.');
        await user.click(screen.getByRole('button', { name: 'Netflix' }));
        await user.type(screen.getByLabelText('Netflix price in euros'), '10');
        expect(screen.getByTestId('hero-yearly')).toHaveTextContent('€120.00');

        await user.click(screen.getByRole('button', { name: /add the rest in the full calculator/i }));

        expect(await screen.findByRole('heading', { name: 'What do your subscriptions cost a year?' })).toBeInTheDocument();
        expect(screen.getByLabelText('Netflix price')).toHaveValue(10);
        expect(screen.getByTestId('calculator-yearly')).toHaveTextContent('€120.00');
    });

    it('puts a yearly bill in its month and previews the reminder for the largest charge', async () => {
        const user = userEvent.setup();
        renderApp('/');

        expect(screen.getByRole('figure', { name: 'Example of a reminder email' })).toHaveTextContent('Example');

        await user.click(screen.getByRole('button', { name: 'Netflix' }));
        await user.type(screen.getByLabelText('Netflix price in euros'), '10');
        expect(screen.getByTestId('hero-peak')).toHaveTextContent('€10.00 every month.');
        expect(screen.getByRole('figure')).toHaveTextContent('Netflix renews in 3 days: €10.00');

        await user.click(screen.getByRole('button', { name: 'Amazon Prime' }));
        await user.type(screen.getByLabelText('Amazon Prime price in euros'), '90');
        const third = screen.getByLabelText('Amazon Prime next charge').querySelectorAll('option')[2];
        await user.selectOptions(screen.getByLabelText('Amazon Prime next charge'), third);

        expect(screen.getByTestId('hero-yearly')).toHaveTextContent('€210.00');
        expect(screen.getByTestId('hero-peak')).toHaveTextContent(`Biggest month: ${third.textContent?.split(' ')[0]}, €100.00.`);
        expect(screen.getByRole('figure')).toHaveTextContent('Amazon Prime renews in 7 days: €90.00');
        expect(screen.getByRole('figure')).not.toHaveTextContent('Example');
    });

    it('steps the price by a whole unit and asks for the month once a row is billed yearly', async () => {
        const user = userEvent.setup();
        renderApp('/');

        await user.click(screen.getByRole('button', { name: 'Netflix' }));
        await user.type(screen.getByLabelText('Netflix price in euros'), '12.99');
        await user.click(screen.getByRole('button', { name: 'Up by 1' }));
        expect(screen.getByLabelText('Netflix price in euros')).toHaveValue(13.99);

        expect(screen.queryByLabelText('Netflix next charge')).not.toBeInTheDocument();
        await user.selectOptions(screen.getByLabelText('Netflix billing cadence'), 'yearly');
        expect(screen.getByLabelText('Netflix next charge')).toBeInTheDocument();
        expect(screen.getByTestId('hero-yearly')).toHaveTextContent('€13.99');
    });
});
