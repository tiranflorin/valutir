import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../App';
import { CALCULATOR_PRESETS } from '../data/calculatorPresets';
import { SERVICE_CATALOG } from '../data/services';
import { INDEXED_PAGES } from '../seo/pages';
import {
    type CalculatorImport,
    type CalculatorRow,
    calculatorImportOf,
    calculatorTotals,
    importFromRows,
    readSharedResult,
    shareFragment,
} from '../utils/calculator';
import { todayIsoDate } from '../utils/dates';
import { bodyOf, callsTo, fakeJwt, mockApi, profile, signIn } from './api';

type Entry = string | { pathname: string; hash?: string; state?: unknown };
const renderApp = (entry: Entry) => render(<MemoryRouter initialEntries={[entry]}><App /></MemoryRouter>);

const row = (overrides: Partial<CalculatorRow>): CalculatorRow =>
    ({ name: 'Netflix', category: 'Entertainment', amount: '10', cadence: 'monthly', included: true, ...overrides });

const inDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return todayIsoDate(date);
};

afterEach(() => vi.unstubAllGlobals());

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

describe('the hand-off to an account', () => {
    it('takes only ticked rows with a price, with the price cleaned up', () => {
        const imported = importFromRows([row({ amount: '9.990' }), row({ name: 'B', amount: '' }), row({ name: 'C', included: false })], 'USD');
        expect(imported).toEqual({ currency: 'USD', rows: [{ name: 'Netflix', category: 'Entertainment', amount: '9.99', cadence: 'monthly' }] });
    });

    it('accepts only well-formed router state', () => {
        expect(calculatorImportOf(null)).toBeNull();
        expect(calculatorImportOf({ calculatorImport: { currency: 'GBP', rows: [{}] } })).toBeNull();
        expect(calculatorImportOf({ calculatorImport: { currency: 'EUR', rows: [] } })).toBeNull();
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
        expect(link).toMatch(/\/calculator#y=120\.00&n=1&c=EUR&t=Entertainment$/);
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
    });
});

describe('saving the calculator list', () => {
    const imported: CalculatorImport = {
        currency: 'USD',
        rows: [
            { name: 'Netflix', category: 'Entertainment', amount: '9.99', cadence: 'monthly' },
            { name: 'Local gym', category: 'Fitness', amount: '30', cadence: 'monthly' },
        ],
    };

    it('signs in, then opens the picker with the list priced, including services not in the catalog', async () => {
        const calls = mockApi({
            'POST /api/login_check': () => ({ status: 200, body: { token: fakeJwt() } }),
            'GET /api/profile': () => ({ status: 200, body: profile() }),
            'POST /api/subs': () => ({ status: 201, body: {} }),
            'GET /api/subs': () => ({ status: 200, body: [] }),
        });
        const user = userEvent.setup();
        renderApp({ pathname: '/login', state: { calculatorImport: imported } });

        await user.type(screen.getByLabelText(/email address/i), 'ada@example.test');
        await user.type(screen.getByLabelText(/^password/i), 'Str0ng-pass');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('heading', { name: 'Pick what you pay for' })).toBeInTheDocument();
        expect(screen.getByText(/your 2 subscriptions from the calculator/i)).toBeInTheDocument();
        expect(screen.getByLabelText('Netflix price')).toHaveValue(9.99);
        expect(screen.getByLabelText('Local gym price')).toHaveValue(30);

        await user.type(screen.getByLabelText('Netflix next charge'), inDays(3));
        await user.type(screen.getByLabelText('Local gym next charge'), inDays(5));
        await user.click(screen.getByRole('button', { name: 'Add 2 subscriptions' }));

        await vi.waitFor(() => expect(callsTo(calls, 'POST /api/subs')).toHaveLength(2));
        const [netflix, gym] = callsTo(calls, 'POST /api/subs').map(bodyOf);
        expect(netflix).toMatchObject({ serviceName: 'Netflix', amount: 9.99, currency: 'USD', manageUrl: 'https://www.netflix.com/account' });
        expect(gym).toMatchObject({ serviceName: 'Local gym', amount: 30, currency: 'USD', category: 'Fitness', manageUrl: null });
    });

    it('lets a service from outside the catalog be removed before saving', async () => {
        signIn();
        mockApi({ 'GET /api/profile': () => ({ status: 200, body: profile() }) });
        const user = userEvent.setup();
        renderApp({ pathname: '/subscriptions/pick', state: { calculatorImport: imported } });

        const gym = screen.getByRole('group', { name: 'Local gym' });
        await user.click(within(gym).getByRole('button', { name: 'Remove' }));

        expect(screen.queryByRole('group', { name: 'Local gym' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add 1 subscription' })).toBeInTheDocument();
    });
});

describe('home page', () => {
    it('totals the quick picks and takes them to the full calculator', async () => {
        const user = userEvent.setup();
        renderApp('/');

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Stop paying for what you don’t use.');
        await user.click(screen.getByRole('button', { name: 'Netflix' }));
        await user.type(screen.getByLabelText('Netflix price in euros'), '10');
        expect(screen.getByTestId('hero-yearly')).toHaveTextContent('€120.00');

        await user.click(screen.getByRole('button', { name: /add the rest in the full calculator/i }));

        expect(await screen.findByRole('heading', { name: 'What do your subscriptions cost a year?' })).toBeInTheDocument();
        expect(screen.getByLabelText('Netflix price')).toHaveValue(10);
        expect(screen.getByTestId('calculator-yearly')).toHaveTextContent('€120.00');
    });
});
