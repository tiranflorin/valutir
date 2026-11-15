/**
 * The calculator's list on its way into an account. "Save it free" keeps it in this browser's
 * localStorage (every tab sees it, so it survives opening the confirmation email in a new tab); the
 * first sign-in afterwards saves it (CalculatorListSaver) and removes it. Nothing is sent to the API
 * before the visitor is signed in. Listed in the Privacy Policy's storage table.
 */
import { API_URL } from '../config';
import { findCatalogService } from '../data/services';
import { type CalculatorImport, validCalculatorImport } from '../utils/calculator';
import { todayIsoDate } from '../utils/dates';

export const CALCULATOR_LIST_KEY = 'valutir_calculator_list';
/** A list nobody signed in for is forgotten after this long. */
export const CALCULATOR_LIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type StoredList = CalculatorImport & { savedAt: number };

export const keepCalculatorList = (list: CalculatorImport, now: number = Date.now()): void => {
    try {
        window.localStorage.setItem(CALCULATOR_LIST_KEY, JSON.stringify({ ...list, savedAt: now } satisfies StoredList));
    } catch {
        // Storage blocked (private mode, settings): the list just isn't carried over.
    }
};

export const forgetCalculatorList = (): void => {
    try {
        window.localStorage.removeItem(CALCULATOR_LIST_KEY);
    } catch {
        // Nothing to clean up.
    }
};

/** The list waiting to be saved, or null (none, malformed or expired; the last two are removed). */
export const pendingCalculatorList = (now: number = Date.now()): CalculatorImport | null => {
    if (typeof window === 'undefined') return null;
    let raw: string | null = null;
    try {
        raw = window.localStorage.getItem(CALCULATOR_LIST_KEY);
    } catch {
        return null;
    }
    if (!raw) return null;
    try {
        const stored = JSON.parse(raw) as StoredList;
        const list = validCalculatorImport(stored);
        if (list && typeof stored.savedAt === 'number' && now - stored.savedAt <= CALCULATOR_LIST_MAX_AGE_MS) {
            return list;
        }
    } catch {
        // Fall through: not ours or damaged.
    }
    forgetCalculatorList();
    return null;
};

/** One month after `today` (YYYY-MM-DD), clamped to the end of a shorter month: 31 Jan -> 28 Feb. */
export const monthAfter = (today: string): string => {
    const [year, month, day] = today.split('-').map(Number);
    const target = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
};

export type CalculatorSaveResult = {
    added: string[];
    /** Already in the account (same name), so not added twice. */
    skipped: string[];
    failed: { name: string; message: string }[];
    nextBillingDate: string;
};

export class UnauthorizedError extends Error {}

const authHeaders = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

/**
 * Adds the list to the signed-in account: one POST per subscription (the free-plan limit applies),
 * active, next charged a month from today. Services already in the account are skipped.
 */
export const saveCalculatorList = async (token: string, list: CalculatorImport, now: Date = new Date()): Promise<CalculatorSaveResult> => {
    const nextBillingDate = monthAfter(todayIsoDate(now));
    const result: CalculatorSaveResult = { added: [], skipped: [], failed: [], nextBillingDate };

    const existingResponse = await fetch(`${API_URL}/api/subs`, { headers: authHeaders(token) });
    if (existingResponse.status === 401) throw new UnauthorizedError();
    const existing = existingResponse.ok ? await existingResponse.json().catch(() => []) : [];
    const existingNames = new Set((Array.isArray(existing) ? existing : [])
        .filter((subscription: { status?: string }) => subscription.status !== 'cancelled')
        .map((subscription: { serviceName?: string }) => (subscription.serviceName ?? '').trim().toLowerCase()));

    for (const row of list.rows) {
        if (existingNames.has(row.name.trim().toLowerCase())) {
            result.skipped.push(row.name);
            continue;
        }
        const response = await fetch(`${API_URL}/api/subs`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify({
                serviceName: row.name,
                amount: Number(row.amount),
                currency: list.currency,
                billingCadence: row.cadence,
                category: row.category,
                status: 'active',
                startedAt: todayIsoDate(now),
                nextBillingDate,
                trialEndsAt: null,
                notes: null,
                paymentMethod: null,
                manageUrl: findCatalogService(row.name)?.manageUrl ?? null,
                householdShared: false,
                householdSize: null,
                autoRenew: true,
                b2b: false,
                cancelledAt: null,
                resumesOn: null,
            }),
        });
        if (response.status === 401) throw new UnauthorizedError();
        if (response.ok) {
            result.added.push(row.name);
            existingNames.add(row.name.trim().toLowerCase());
            continue;
        }
        const data = await response.json().catch(() => null);
        result.failed.push({ name: row.name, message: data?.message || `Could not add ${row.name}.` });
        // The free-plan limit stops the rest too.
        if (response.status === 402) {
            const index = list.rows.indexOf(row);
            list.rows.slice(index + 1).forEach((rest) => result.failed.push({ name: rest.name, message: data?.message || 'The free plan limit was reached.' }));
            break;
        }
    }

    return result;
};
