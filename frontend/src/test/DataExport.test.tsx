import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../pages/ProfilePage';
import MySubscriptionsPage from '../pages/MySubscriptionsPage';
import { attachmentFilename } from '../services/account';
import { authHeader, callsTo, mockApi, profile, signIn, STORAGE_KEY } from './api';
import { renderWithMemoryRoute } from './test-utils';

const JSON_FILE = 'attachment; filename=valutir-export-2026-11-06.json';
const CSV_FILE = 'attachment; filename=valutir-subscriptions-business-2026-11-06.csv';

/** Records the file names handed to the browser's download. */
const captureDownloads = () => {
    const names: string[] = [];
    vi.stubGlobal('URL', Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:valutir-test'),
        revokeObjectURL: vi.fn(),
    }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        names.push(this.download);
    });
    return names;
};

const exportApi = (overrides: Record<string, () => { status: number; body?: unknown; headers?: Record<string, string> }> = {}) => mockApi({
    'GET /api/profile': () => ({ status: 200, body: profile() }),
    'GET /api/subs': () => ({ status: 200, body: [] }),
    'GET /api/profile/export': () => ({ status: 200, body: '{"format":"valutir-account-export"}', headers: { 'Content-Type': 'application/json', 'Content-Disposition': JSON_FILE } }),
    'GET /api/profile/export/subscriptions.csv': () => ({ status: 200, body: 'Service\nNetflix\n', headers: { 'Content-Type': 'text/csv', 'Content-Disposition': CSV_FILE } }),
    ...overrides,
});

describe('Download my data', () => {
    beforeEach(() => {
        signIn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('downloads the JSON copy with the token and the server’s file name', async () => {
        const calls = exportApi();
        const downloads = captureDownloads();
        const user = userEvent.setup();
        renderWithMemoryRoute(<ProfilePage />, { route: '/profile' });

        await user.click(await screen.findByRole('button', { name: /download all my data/i }));

        expect(await screen.findByText('Your data file is downloading.')).toBeInTheDocument();
        const [call] = callsTo(calls, 'GET /api/profile/export');
        expect(authHeader(call)).toMatch(/^Bearer /);
        expect(downloads).toEqual(['valutir-export-2026-11-06.json']);
    });

    it('downloads the subscriptions CSV', async () => {
        const calls = exportApi();
        const downloads = captureDownloads();
        const user = userEvent.setup();
        renderWithMemoryRoute(<ProfilePage />, { route: '/profile' });

        await user.click(await screen.findByRole('button', { name: /download subscriptions \(csv\)/i }));

        expect(await screen.findByText('Your subscriptions spreadsheet is downloading.')).toBeInTheDocument();
        expect(callsTo(calls, 'GET /api/profile/export/subscriptions.csv')[0].url).not.toContain('view=');
        expect(downloads).toEqual(['valutir-subscriptions-business-2026-11-06.csv']);
    });

    it('shows the server’s message when there were too many downloads', async () => {
        exportApi({ 'GET /api/profile/export': () => ({ status: 429, body: { message: 'Too many downloads. Please try again later.' } }) });
        const downloads = captureDownloads();
        const user = userEvent.setup();
        renderWithMemoryRoute(<ProfilePage />, { route: '/profile' });

        await user.click(await screen.findByRole('button', { name: /download all my data/i }));

        expect(await screen.findByText('Too many downloads. Please try again later.')).toBeInTheDocument();
        expect(downloads).toEqual([]);
    });

    it('signs out when the token was revoked', async () => {
        exportApi({ 'GET /api/profile/export': () => ({ status: 401, body: { message: 'Invalid JWT Token' } }) });
        captureDownloads();
        const user = userEvent.setup();
        renderWithMemoryRoute(<ProfilePage />, { route: '/profile' });

        await user.click(await screen.findByRole('button', { name: /download all my data/i }));

        await vi.waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull());
    });

    it('exports only the current view from the dashboard', async () => {
        window.localStorage.setItem('valutir_dashboard_view', 'business');
        const calls = exportApi({
            'GET /api/subs': () => ({ status: 200, body: [{
                id: 1, serviceName: 'Figma', amount: '15.00', currency: 'EUR', billingCadence: 'monthly', category: 'Design',
                status: 'active', startedAt: null, nextBillingDate: '2030-01-01', cancelledAt: null, trialEndsAt: null,
                trialReminderSentAt: null, b2b: true, autoRenew: true, notes: null,
            }] }),
        });
        const downloads = captureDownloads();
        const user = userEvent.setup();
        renderWithMemoryRoute(<MySubscriptionsPage />, { route: '/my-subs' });

        await user.click(await screen.findByRole('button', { name: 'Export CSV' }));

        await vi.waitFor(() => expect(downloads).toEqual(['valutir-subscriptions-business-2026-11-06.csv']));
        expect(callsTo(calls, 'GET /api/profile/export/subscriptions.csv')[0].url).toContain('?view=business');
    });
});

describe('attachment file names', () => {
    it('reads plain names and ignores anything else', () => {
        expect(attachmentFilename('attachment; filename="valutir-export-2026-11-06.json"')).toBe('valutir-export-2026-11-06.json');
        expect(attachmentFilename(JSON_FILE)).toBe('valutir-export-2026-11-06.json');
        expect(attachmentFilename('attachment; filename="../../etc/passwd"')).toBe(null);
        expect(attachmentFilename(null)).toBe(null);
    });
});
