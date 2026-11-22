import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoicesPage from '../pages/InvoicesPage';
import type { BusinessCharge } from '../services/business';
import { todayIsoDate } from '../utils/dates';
import { addMonths, quarterOf, yearMonthLabel, yearMonthOf } from '../utils/yearMonth';
import { callsTo, type Handlers, mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const thisMonth = yearMonthOf(new Date());
const inDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return todayIsoDate(date);
};

const charge = (overrides: Partial<BusinessCharge>): BusinessCharge => ({
    subscriptionId: 1,
    serviceName: 'Figma',
    category: 'Software',
    manageUrl: 'https://www.figma.com/settings',
    date: `${thisMonth}-01`,
    amount: '12.00',
    currency: 'EUR',
    paidPersonally: false,
    upcoming: false,
    invoiceFiled: false,
    ...overrides,
});

/** `admin`: paid features without the unlock. */
const billing = (paid: boolean | 'admin') => ({
    unlocked: paid === true,
    unlockedAt: paid === true ? '2026-11-01T10:00:00+00:00' : null,
    paidFeatures: paid !== false,
    checkoutAvailable: true,
    price: { amountInCents: 1999, currency: 'EUR', taxInclusive: true },
    freeActiveLimit: 40,
    activeCount: 3,
});

const invoicesApi = (charges: BusinessCharge[], overrides: Handlers = {}, paid: boolean | 'admin' = false) => mockApi({
    'GET /api/profile': () => ({ status: 200, body: profile() }),
    'GET /api/billing': () => ({ status: 200, body: billing(paid) }),
    'GET /api/business/charges': (call) => ({ status: 200, body: { month: new URL(call.url).searchParams.get('month'), charges } }),
    [`PUT /api/business/charges/1/${thisMonth}-01/invoice`]: () => ({ status: 204 }),
    [`DELETE /api/business/charges/2/${thisMonth}-01/invoice`]: () => ({ status: 204 }),
    ...overrides,
});

describe('business invoices', () => {
    beforeEach(() => {
        signIn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('ticks and unticks the invoices of charges that have gone out', async () => {
        const calls = invoicesApi([
            charge({}),
            charge({ subscriptionId: 2, serviceName: 'Notion', invoiceFiled: true }),
            charge({ subscriptionId: 3, serviceName: 'Slack', date: inDays(3), upcoming: true }),
        ]);
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        expect(await screen.findByTestId('invoices-progress')).toHaveTextContent('1 of 2 invoices filed');
        const list = screen.getByRole('list', { name: `Business charges in ${yearMonthLabel(thisMonth)}` });
        expect(within(list).getAllByRole('checkbox')).toHaveLength(2);
        expect(within(list).getByText('Due in 3 days')).toBeInTheDocument();
        // Only the missing invoice links to the provider's billing page.
        expect(within(list).getAllByRole('link', { name: /Billing page/ })).toHaveLength(1);

        await userEvent.click(screen.getByRole('checkbox', { name: /Invoice filed: Figma/ }));
        expect(screen.getByTestId('invoices-progress')).toHaveTextContent('All 2 invoices filed');
        await userEvent.click(screen.getByRole('checkbox', { name: /Invoice filed: Notion/ }));

        expect(callsTo(calls, `PUT /api/business/charges/1/${thisMonth}-01/invoice`)).toHaveLength(1);
        expect(callsTo(calls, `DELETE /api/business/charges/2/${thisMonth}-01/invoice`)).toHaveLength(1);
        expect(screen.getByRole('checkbox', { name: /Invoice filed: Notion/ })).not.toBeChecked();
    });

    it("adds up what the company owes for charges paid with the owner's card", async () => {
        invoicesApi([
            charge({ paidPersonally: true }),
            charge({ subscriptionId: 2, serviceName: 'Notion', amount: '50.00', currency: 'RON', paidPersonally: true }),
            charge({ subscriptionId: 3, serviceName: 'Slack', amount: '7.00', paidPersonally: false }),
            // Still to come: not owed yet.
            charge({ subscriptionId: 4, serviceName: 'Zoom', amount: '15.00', date: inDays(3), upcoming: true, paidPersonally: true }),
        ]);
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        expect(await screen.findByTestId('invoices-owed')).toHaveTextContent(`The company owes you €12.00 and 50.00 RON for ${yearMonthLabel(thisMonth)}`);
        expect(screen.getAllByText('Paid with your own card')).toHaveLength(3);
    });

    it('says nothing is owed when the company paid for everything', async () => {
        invoicesApi([charge({})]);
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        expect(await screen.findByTestId('invoices-progress')).toBeInTheDocument();
        expect(screen.queryByTestId('invoices-owed')).not.toBeInTheDocument();
    });

    it('puts the tick back when it could not be saved', async () => {
        invoicesApi([charge({})], {
            [`PUT /api/business/charges/1/${thisMonth}-01/invoice`]: () => ({ status: 500, body: { message: 'Something went wrong.' } }),
        });
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        await userEvent.click(await screen.findByRole('checkbox', { name: /Invoice filed: Figma/ }));

        expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /Invoice filed: Figma/ })).not.toBeChecked();
    });

    it('goes back a month, but not past the current one', async () => {
        const calls = invoicesApi([]);
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        expect(await screen.findByText(`No business charges in ${yearMonthLabel(thisMonth)}.`)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
        await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));

        const previous = addMonths(thisMonth, -1);
        expect(await screen.findByText(`No business charges in ${yearMonthLabel(previous)}.`)).toBeInTheDocument();
        expect(callsTo(calls, 'GET /api/business/charges').map((call) => new URL(call.url).searchParams.get('month'))).toEqual([thisMonth, previous]);
    });

    it('offers the accountant export only with the unlock', async () => {
        invoicesApi([charge({})]);
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        expect(await screen.findByText(/The export comes with the one-time unlock/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Download/ })).not.toBeInTheDocument();
    });

    it('offers the accountant export to an admin account without the unlock', async () => {
        invoicesApi([charge({})], {}, 'admin');
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        expect(await screen.findByRole('button', { name: `Download ${yearMonthLabel(thisMonth)}` })).toBeEnabled();
        expect(screen.queryByText(/The export comes with the one-time unlock/)).not.toBeInTheDocument();
    });

    it('downloads the month or its quarter for the accountant', async () => {
        const names: string[] = [];
        vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:valutir-test'), revokeObjectURL: vi.fn() }));
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            names.push(this.download);
        });
        const calls = invoicesApi([charge({})], {
            'GET /api/business/export.csv': () => ({
                status: 200,
                body: 'Date,Service\n',
                headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename=valutir-business-charges-${thisMonth}.csv` },
            }),
        }, true);
        renderWithMemoryRoute(<InvoicesPage />, { route: '/invoices' });

        await userEvent.click(await screen.findByRole('button', { name: `Download ${yearMonthLabel(thisMonth)}` }));
        const quarter = quarterOf(thisMonth, thisMonth);
        await userEvent.click(screen.getByRole('button', { name: `Download ${quarter.label}` }));

        await waitFor(() => expect(names).toHaveLength(2));
        expect(callsTo(calls, 'GET /api/business/export.csv').map((call) => new URL(call.url).search)).toEqual([
            `?from=${thisMonth}&to=${thisMonth}`,
            `?from=${quarter.from}&to=${thisMonth}`,
        ]);
    });
});
