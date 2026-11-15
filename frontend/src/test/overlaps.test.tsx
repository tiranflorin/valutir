import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import InsightsPage from '../pages/InsightsPage';
import ReviewSubscriptionsPage from '../pages/ReviewSubscriptionsPage';
import { SERVICE_CATALOG, findCatalogService } from '../data/services';
import type { SubscriptionRecord } from '../types/subscription';
import { catalogServiceOf } from '../data/services';
import { findOverlaps, overlapReasons } from '../utils/overlaps';
import { reviewQueue } from '../utils/reviewQueue';
import { mockApi, profile, signIn } from './api';
import { renderWithMemoryRoute } from './test-utils';

const sub = (id: number, serviceName: string, extra: Partial<SubscriptionRecord> = {}) => ({
    id,
    serviceName,
    amount: '10.00',
    currency: 'EUR',
    billingCadence: 'monthly',
    category: 'Entertainment',
    status: 'active',
    startedAt: '2026-01-01',
    nextBillingDate: '2030-01-15',
    cancelledAt: null,
    trialEndsAt: null,
    trialReminderSentAt: null,
    b2b: false,
    autoRenew: true,
    householdShared: false,
    householdSize: null,
    reviewFlagged: false,
    reviewNote: null,
    manageUrl: null,
    ...extra,
}) as SubscriptionRecord;

const kinds = (list: SubscriptionRecord[]) => findOverlaps(list).map((overlap) => overlap.kind);

describe('overlap data in the catalog', () => {
    it('lists only catalog services in bundles and groups', () => {
        SERVICE_CATALOG.forEach((service) => {
            service.includes?.forEach((name) => expect(findCatalogService(name)?.name, `${service.name} includes ${name}`).toBe(name));
        });
    });

    it('leaves video and AI assistants without a group, since people often pay for several', () => {
        ['Netflix', 'Disney+', 'HBO Max', 'ChatGPT Plus', 'Claude Pro', 'GitHub Copilot', 'Cursor'].forEach((name) =>
            expect(findCatalogService(name)?.group, name).toBeUndefined());
    });
});

describe('finding overlaps', () => {
    it('reports the same service twice, by catalog name or alias, and what the extra copy costs a year', () => {
        const [duplicate] = findOverlaps([sub(1, 'Spotify', { amount: '11.99' }), sub(2, ' spotify ', { amount: '5.99' })]);
        expect(duplicate).toMatchObject({ kind: 'duplicate', name: 'Spotify' });
        expect(duplicate.kind === 'duplicate' && duplicate.extraYearly).toBeCloseTo(71.88);
        expect(kinds([sub(1, 'iCloud+'), sub(2, 'icloud')])).toEqual(['duplicate']);
    });

    it('recognises a catalog service followed by a plan name, and nothing looser', () => {
        expect(catalogServiceOf('Google One Basic')?.name).toBe('Google One');
        expect(catalogServiceOf('spotify  family')?.name).toBe('Spotify');
        expect(catalogServiceOf('iCloud+ 200GB')?.name).toBe('iCloud+');
        expect(catalogServiceOf('icloud 2TB')?.name).toBe('iCloud+');
        expect(catalogServiceOf('Apple One Premier')?.name).toBe('Apple One');
        expect(catalogServiceOf('YouTube Premium Family')?.name).toBe('YouTube Premium');
        // A whole word is needed: no partial names, no guesses from a shared first word.
        expect(catalogServiceOf('Spotifyx')).toBeUndefined();
        expect(catalogServiceOf('Google')).toBeUndefined();
        expect(catalogServiceOf('Apple Watch band')).toBeUndefined();
    });

    it('finds overlaps through plan names', () => {
        expect(kinds([sub(1, 'Google One Basic'), sub(2, 'Dropbox')])).toEqual(['group']);
        expect(kinds([sub(1, 'Spotify'), sub(2, 'Spotify Family')])).toEqual(['duplicate']);
        expect(kinds([sub(1, 'Apple One Premier'), sub(2, 'iCloud+ 200GB')])).toEqual(['bundle']);
    });

    it('matches names the user typed only when they are the same', () => {
        expect(kinds([sub(1, 'Local gym'), sub(2, 'local gym')])).toEqual(['duplicate']);
        expect(kinds([sub(1, 'Local gym'), sub(2, 'Local gym (2)')])).toEqual([]);
    });

    it('reports a bundle that already includes another subscription, and not again as a group', () => {
        const overlaps = findOverlaps([
            sub(1, 'Apple One', { amount: '19.95' }),
            sub(2, 'Apple Music', { amount: '10.99' }),
            sub(3, 'iCloud+', { amount: '2.99', category: 'Cloud' }),
            sub(4, 'YouTube Premium', { amount: '12.99' }),
            sub(5, 'YouTube Music', { amount: '10.99', billingCadence: 'yearly' }),
        ]);
        expect(overlaps.map((overlap) => overlap.kind)).toEqual(['bundle', 'bundle']);
        const [apple, youtube] = overlaps;
        expect(apple.kind === 'bundle' && apple.included.map((item) => item.serviceName)).toEqual(['Apple Music', 'iCloud+']);
        expect(apple.kind === 'bundle' && apple.includedYearly).toBeCloseTo((10.99 + 2.99) * 12);
        expect(youtube.kind === 'bundle' && youtube.includedYearly).toBeCloseTo(10.99);
    });

    // Conservative on purpose: YouTube Premium is bought for ad-free video, Apple One for storage and
    // TV, so neither makes Spotify a second music service.
    it('checks a bundle only against what it includes, never as a member of a group', () => {
        expect(kinds([sub(1, 'Apple One'), sub(2, 'Spotify')])).toEqual([]);
        expect(kinds([sub(1, 'YouTube Premium'), sub(2, 'Spotify')])).toEqual([]);
        expect(kinds([sub(1, 'Apple One'), sub(2, 'Google One')])).toEqual([]);
    });

    it('reports several services for one job, with what they cost together', () => {
        const [storage] = findOverlaps([sub(1, 'iCloud+', { amount: '2.99' }), sub(2, 'Google One', { amount: '1.99' }), sub(3, 'Dropbox', { amount: '119.88', billingCadence: 'yearly' })]);
        expect(storage).toMatchObject({ kind: 'group', group: 'cloud-storage' });
        expect(storage.kind === 'group' && storage.totalYearly).toBeCloseTo(2.99 * 12 + 1.99 * 12 + 119.88);
        expect(kinds([sub(1, '1Password'), sub(2, 'Bitwarden')])).toEqual(['group']);
    });

    it('stays quiet about normal combinations and single services', () => {
        expect(kinds([sub(1, 'Netflix'), sub(2, 'Disney+'), sub(3, 'HBO Max')])).toEqual([]);
        expect(kinds([sub(1, 'ChatGPT Plus'), sub(2, 'Claude Pro')])).toEqual([]);
        expect(kinds([sub(1, 'Spotify'), sub(2, 'Netflix'), sub(3, 'iCloud+')])).toEqual([]);
        expect(kinds([sub(1, 'Apple One'), sub(2, 'Netflix')])).toEqual([]);
    });

    it('ignores paused and cancelled subscriptions', () => {
        expect(kinds([sub(1, 'Spotify'), sub(2, 'Apple Music', { status: 'cancelled' }), sub(3, 'Tidal', { status: 'paused' })])).toEqual([]);
        expect(kinds([sub(1, 'Spotify'), sub(2, 'Apple Music', { status: 'trial' })])).toEqual(['group']);
    });

    it('uses the amount it is given, such as the user’s share of a shared bill', () => {
        const [overlap] = findOverlaps([sub(1, 'Spotify', { amount: '18' }), sub(2, 'Tidal', { amount: '10' })], (item) => Number(item.amount) / 2);
        expect(overlap.kind === 'group' && overlap.totalYearly).toBeCloseTo(14 * 12);
    });

    it('explains each one in a line for the review card', () => {
        const reasons = overlapReasons(findOverlaps([
            sub(1, 'Apple One'), sub(2, 'iCloud+'), sub(3, 'Spotify'), sub(4, 'Tidal'), sub(5, 'Gym'), sub(6, 'Gym'),
        ]));
        expect(reasons.get(2)).toBe('Already included in your Apple One.');
        expect(reasons.get(3)).toBe('You also pay for Tidal (music streaming).');
        expect(reasons.get(5)).toBe("Listed 2 times: check it isn't the same account twice.");
        // The bundle itself is what you keep; the separate copy of something it includes is the question.
        expect(reasons.has(1)).toBe(false);
    });
});

describe('the keep-or-cancel review', () => {
    it('puts overlaps after trials ending soon and flagged ones, before the rest', () => {
        const order = reviewQueue([
            sub(1, 'Netflix', { amount: '50.00' }),
            sub(2, 'Spotify', { amount: '5.00' }),
            sub(3, 'Gym', { reviewFlagged: true }),
            sub(4, 'Apple Music', { amount: '6.00' }),
            sub(5, 'Design app', { status: 'trial', trialEndsAt: '2026-11-17' }),
        ], new Date(2026, 10, 15, 10, 30)).map((item) => item.serviceName);
        expect(order).toEqual(['Design app', 'Gym', 'Apple Music', 'Spotify', 'Netflix']);
    });
});

describe('pages', () => {
    beforeEach(() => signIn());

    const api = (list: SubscriptionRecord[]) => mockApi({
        'GET /api/profile': () => ({ status: 200, body: profile() }),
        'GET /api/subs': () => ({ status: 200, body: list }),
    });

    it('shows a "Worth a look" card on Insights, and none without overlaps', async () => {
        api([sub(1, 'Apple One', { amount: '19.95' }), sub(2, 'iCloud+', { amount: '2.99' }), sub(3, 'Google One', { amount: '1.99' }), sub(4, 'Dropbox', { amount: '9.99' })]);
        const { unmount } = renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        const card = await screen.findByRole('region', { name: 'Worth a look' });
        expect(within(card).getByText('Apple One already includes iCloud+')).toBeInTheDocument();
        expect(card).toHaveTextContent('You also pay for iCloud+ separately: €35.88 a year.');
        expect(within(card).getByText('2 cloud storage plans')).toBeInTheDocument();
        expect(card).toHaveTextContent('Dropbox and Google One together cost €143.76 a year.');
        expect(within(card).queryByText(/is listed/)).not.toBeInTheDocument();
        expect(within(card).getByRole('link', { name: 'iCloud+' })).toHaveAttribute('href', '/subscriptions/2');
        unmount();

        api([sub(1, 'Netflix'), sub(2, 'Spotify')]);
        const clear = renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });
        expect(await screen.findByRole('region', { name: 'Worth a look' })).toHaveTextContent('Nothing you pay for twice');
        clear.unmount();

        // One subscription: nothing to compare, so no card.
        api([sub(1, 'Netflix')]);
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });
        expect(await screen.findByRole('heading', { name: 'By category' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Worth a look' })).not.toBeInTheDocument();
    });

    it('tells duplicate copies apart by what each costs', async () => {
        api([sub(1, 'Spotify', { amount: '11.99' }), sub(2, 'Spotify', { amount: '5.99' })]);
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        const card = await screen.findByRole('region', { name: 'Worth a look' });
        expect(within(card).getByText('Spotify is listed 2 times')).toBeInTheDocument();
        expect(card).toHaveTextContent('the extra one costs €71.88 a year.');
        expect(within(card).getByRole('link', { name: '€11.99 monthly' })).toHaveAttribute('href', '/subscriptions/1');
        expect(within(card).getByRole('link', { name: '€5.99 monthly' })).toHaveAttribute('href', '/subscriptions/2');
    });

    it('names copies whose names differ, such as a plan', async () => {
        api([sub(1, 'Spotify', { amount: '11.99' }), sub(2, 'Spotify Family', { amount: '17.99' })]);
        renderWithMemoryRoute(<InsightsPage />, { route: '/insights' });

        const card = await screen.findByRole('region', { name: 'Worth a look' });
        expect(within(card).getByText('Spotify is listed 2 times')).toBeInTheDocument();
        expect(within(card).getByRole('link', { name: 'Spotify Family, €17.99 monthly' })).toHaveAttribute('href', '/subscriptions/2');
        expect(within(card).getByRole('link', { name: 'Spotify, €11.99 monthly' })).toHaveAttribute('href', '/subscriptions/1');
    });

    it('says why on the review card', async () => {
        api([sub(1, 'Netflix', { amount: '50.00' }), sub(2, 'Spotify', { amount: '11.99' }), sub(3, 'Apple Music', { amount: '10.99' })]);
        renderWithMemoryRoute(<ReviewSubscriptionsPage />, { route: '/review' });

        expect(await screen.findByRole('heading', { level: 2, name: 'Spotify' })).toBeInTheDocument();
        expect(screen.getByText('Overlap')).toBeInTheDocument();
        expect(screen.getByText('You also pay for Apple Music (music streaming).')).toBeInTheDocument();
    });
});
