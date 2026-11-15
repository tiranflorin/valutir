/**
 * Subscriptions that probably pay for the same thing twice. Three checks, most certain first:
 *
 * 1. duplicate: the same service listed more than once.
 * 2. bundle: a bundle (Apple One, YouTube Premium) that already includes another subscription.
 * 3. group: two or more standalone services for a job one usually does (cloud storage, music,
 *    passwords). Bundles don't join groups: people buy YouTube Premium for ad-free video, not as a
 *    second music service, so counting what a bundle includes here would mostly raise false alarms.
 *
 * Only catalog services are recognised (data/services.ts, `group` and `includes`), by their name or
 * that name followed by a plan ("Spotify Family"); other typed names only match each other exactly.
 * Pass active and trial subscriptions in one currency; amounts are never added across currencies.
 */
import { type CatalogService, type OverlapGroup, SERVICE_CATALOG, findCatalogService } from '../data/services';
import { yearlyCostOf } from './insights';
import type { ChargeSource } from './monthCharges';

export type Overlap<T extends ChargeSource = ChargeSource> =
    | {
          kind: 'duplicate';
          name: string;
          subscriptions: T[];
          /** What every copy but the most expensive costs a year. */
          extraYearly: number;
      }
    | {
          kind: 'bundle';
          bundle: T;
          /** Subscriptions the bundle already includes. */
          included: T[];
          includedYearly: number;
      }
    | {
          kind: 'group';
          group: OverlapGroup;
          subscriptions: T[];
          totalYearly: number;
      };

export const GROUP_LABELS: Record<OverlapGroup, { plural: string; job: string }> = {
    'cloud-storage': { plural: 'cloud storage plans', job: 'cloud storage' },
    music: { plural: 'music streaming services', job: 'music streaming' },
    'password-manager': { plural: 'password managers', job: 'a password manager' },
};

/**
 * The catalog service a subscription is, also when a plan name follows it: "Google One Basic",
 * "Spotify Family", "iCloud+ 200GB". The typed name must start with the whole catalog name (or an
 * alias) and a space, and the longest match wins ("Apple One Premier" is Apple One), so nothing is
 * guessed from a partial word. Only used here: the add form's suggestions stay exact.
 */
export const catalogServiceOf = (serviceName: string): CatalogService | undefined => {
    const exact = findCatalogService(serviceName);
    if (exact) return exact;
    const typed = serviceName.trim().toLowerCase().replace(/\s+/g, ' ');
    let best: { service: CatalogService; length: number } | undefined;
    SERVICE_CATALOG.forEach((service) => {
        [service.name, ...(service.aliases ?? [])].forEach((name) => {
            const prefix = `${name.toLowerCase()} `;
            if (typed.startsWith(prefix) && prefix.length > (best?.length ?? 0)) best = { service, length: prefix.length };
        });
    });
    return best?.service;
};

const keyOf = (subscription: ChargeSource, catalog: CatalogService | undefined) =>
    catalog ? `catalog:${catalog.name}` : `typed:${subscription.serviceName.trim().toLowerCase()}`;

export const findOverlaps = <T extends ChargeSource>(
    subscriptions: T[],
    amountFor: (subscription: T) => number = (subscription) => Number(subscription.amount) || 0,
): Overlap<T>[] => {
    const charged = subscriptions.filter((subscription) => subscription.status === 'active' || subscription.status === 'trial');
    const yearly = (subscription: T) => yearlyCostOf(amountFor(subscription), subscription.billingCadence);
    const catalogOf = new Map(charged.map((subscription) => [subscription.id, catalogServiceOf(subscription.serviceName)]));
    const overlaps: Overlap<T>[] = [];

    // 1. The same service more than once.
    const byKey = new Map<string, T[]>();
    charged.forEach((subscription) => {
        const key = keyOf(subscription, catalogOf.get(subscription.id));
        byKey.set(key, [...(byKey.get(key) ?? []), subscription]);
    });
    // One entry per service from here on: the most expensive copy stands for it.
    const distinct: T[] = [];
    byKey.forEach((copies) => {
        const sorted = [...copies].sort((a, b) => yearly(b) - yearly(a));
        distinct.push(sorted[0]);
        if (copies.length > 1) {
            overlaps.push({
                kind: 'duplicate',
                name: catalogOf.get(sorted[0].id)?.name ?? sorted[0].serviceName.trim(),
                subscriptions: sorted,
                extraYearly: sorted.slice(1).reduce((sum, subscription) => sum + yearly(subscription), 0),
            });
        }
    });

    // 2. A bundle that already includes another subscription.
    const coveredByBundle = new Set<number>();
    distinct.forEach((bundle) => {
        const includes = catalogOf.get(bundle.id)?.includes ?? [];
        if (!includes.length) return;
        const included = distinct.filter((other) => other !== bundle && includes.includes(catalogOf.get(other.id)?.name ?? ''));
        if (!included.length) return;
        included.forEach((subscription) => coveredByBundle.add(subscription.id));
        overlaps.push({
            kind: 'bundle',
            bundle,
            included,
            includedYearly: included.reduce((sum, subscription) => sum + yearly(subscription), 0),
        });
    });

    // 3. Two or more standalone services for the same job. One already reported inside a bundle
    // isn't reported again.
    const groups = new Map<OverlapGroup, T[]>();
    distinct
        .filter((subscription) => !coveredByBundle.has(subscription.id))
        .forEach((subscription) => {
            const group = catalogOf.get(subscription.id)?.group;
            if (group) groups.set(group, [...(groups.get(group) ?? []), subscription]);
        });
    groups.forEach((members, group) => {
        if (members.length < 2) return;
        const sorted = [...members].sort((a, b) => yearly(b) - yearly(a));
        overlaps.push({ kind: 'group', group, subscriptions: sorted, totalYearly: sorted.reduce((sum, subscription) => sum + yearly(subscription), 0) });
    });

    return overlaps;
};

/** One short line per subscription that is part of an overlap, for the keep-or-cancel review card. */
export const overlapReasons = <T extends ChargeSource>(overlaps: Overlap<T>[]): Map<number, string> => {
    const reasons = new Map<number, string>();
    const others = (list: T[], self: T) => list.filter((item) => item !== self).map((item) => item.serviceName.trim());
    const set = (subscription: T, reason: string) => {
        if (!reasons.has(subscription.id)) reasons.set(subscription.id, reason);
    };
    overlaps.forEach((overlap) => {
        if (overlap.kind === 'duplicate') {
            overlap.subscriptions.forEach((subscription) => set(subscription, `Listed ${overlap.subscriptions.length} times: check it isn't the same account twice.`));
        } else if (overlap.kind === 'bundle') {
            overlap.included.forEach((subscription) => set(subscription, `Already included in your ${overlap.bundle.serviceName.trim()}.`));
        } else {
            overlap.subscriptions.forEach((subscription) =>
                set(subscription, `You also pay for ${joinNames(others(overlap.subscriptions, subscription))} (${GROUP_LABELS[overlap.group].job}).`));
        }
    });
    return reasons;
};

/** "A", "A and B", "A, B and C". */
export const joinNames = (names: string[]): string =>
    names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
