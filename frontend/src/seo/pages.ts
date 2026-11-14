/**
 * Which routes search engines and AI crawlers may index, and what each one is called.
 *
 * Every route in App.tsx must be listed here (test/seo.test.ts checks it):
 * - INDEXED_PAGES are prerendered to real HTML at build time (build/prerender.ts), listed in the
 *   sitemap and llms.txt, and open to every crawler.
 * - UNLISTED_PAGES get an empty, noindex page: signed-in screens, and links that carry a token.
 *   robots.txt keeps crawlers out of them.
 */
import { LEGAL } from '../legal';

export const SITE_NAME = 'ValuTir';

export type IndexedPage = {
    path: string;
    /** The full <title>, under about 60 characters. */
    title: string;
    /** The meta description, under about 160 characters. */
    description: string;
    /** One line for llms.txt. */
    summary: string;
};

export type UnlistedPage = { path: string; title: string };

export const INDEXED_PAGES: IndexedPage[] = [
    {
        path: '/',
        title: 'ValuTir · Track subscriptions, free trials and renewals',
        description: 'Keep your subscriptions, free trials and renewal dates in one place, see what they cost a month and a year, and get reminded before each charge. Free up to 50.',
        summary: 'What ValuTir does: subscriptions, trial end dates, renewal calendar, reminders, Personal and Business views.',
    },
    {
        path: '/plans',
        title: 'Plans and pricing · ValuTir',
        description: `ValuTir is free for up to 50 active subscriptions, with Personal and Business views. A one-time ${LEGAL.unlockPrice} unlock (VAT included) lifts the limit. No monthly fee.`,
        summary: `Pricing: free up to 50 active subscriptions; a one-time ${LEGAL.unlockPrice} unlock, VAT included, no subscription.`,
    },
    {
        path: '/register',
        title: 'Create a free account · ValuTir',
        description: 'Create a free ValuTir account to track your subscriptions, trial end dates and renewals, with a reminder email before each charge.',
        summary: 'Sign up for free; no card required.',
    },
    {
        path: '/login',
        title: 'Sign in · ValuTir',
        description: 'Sign in to ValuTir to see your subscriptions, upcoming renewals and what they cost.',
        summary: 'Sign in to an existing account.',
    },
    {
        path: '/contact',
        title: 'Contact · ValuTir',
        description: 'Questions about ValuTir, your account or a payment? Send the ValuTir team a message.',
        summary: 'Contact form for questions about the app, an account or a payment.',
    },
    {
        path: '/privacy',
        title: 'Privacy policy · ValuTir',
        description: 'What ValuTir stores about you and your subscriptions, why, for how long, who processes it, and how to download or delete it.',
        summary: 'Privacy policy: data collected, processors, retention, cookies and browser storage, your rights.',
    },
    {
        path: '/terms',
        title: 'Terms of use · ValuTir',
        description: 'The terms for using ValuTir: your account, the free plan, the one-time unlock, refunds, fair use and liability.',
        summary: 'Terms of use.',
    },
    {
        path: '/refunds',
        title: 'Refund policy · ValuTir',
        description: `The one-time ValuTir unlock comes with a ${LEGAL.refundDays}-day money-back guarantee. How to ask for a refund and what happens to your account.`,
        summary: `Refund policy: ${LEGAL.refundDays}-day money-back guarantee on the one-time unlock.`,
    },
];

export const UNLISTED_PAGES: UnlistedPage[] = [
    // Public, but only reached from an email link or a form.
    { path: '/request-password-reset', title: 'Reset your password · ValuTir' },
    { path: '/new-password', title: 'Set a new password · ValuTir' },
    { path: '/reset-password', title: 'Set a new password · ValuTir' },
    { path: '/confirm-email', title: 'Confirm your email · ValuTir' },
    { path: '/verify-email', title: 'Verify your email · ValuTir' },
    { path: '/unsubscribe', title: 'Turn off reminders · ValuTir' },
    // Signed in.
    { path: '/my-subs', title: 'Your subscriptions · ValuTir' },
    { path: '/subscriptions/new', title: 'Add a subscription · ValuTir' },
    { path: '/subscriptions/pick', title: 'Pick what you pay for · ValuTir' },
    { path: '/calendar', title: 'Renewal calendar · ValuTir' },
    { path: '/insights', title: 'Insights · ValuTir' },
    { path: '/review', title: 'Review my subscriptions · ValuTir' },
    { path: '/profile', title: 'Your profile · ValuTir' },
    { path: '/preferences', title: 'Preferences · ValuTir' },
];

/** Routes with parameters (/subscriptions/:id, /calendar/day/:date) live under these. */
export const PRIVATE_PREFIXES = ['/subscriptions/', '/calendar/'];

/** What a crawler or link preview is told about the page at this path. */
export type PageHead = {
    title: string;
    description: string;
    indexable: boolean;
    /** Absolute URL, only for indexable pages. */
    canonical?: string;
};

export const NOT_FOUND_TITLE = 'Page not found · ValuTir';

const DEFAULT_DESCRIPTION = INDEXED_PAGES[0].description;

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

export const pageHead = (path: string, siteUrl: string): PageHead => {
    const normalized = normalizePath(path);
    const indexed = INDEXED_PAGES.find((page) => page.path === normalized);
    if (indexed) {
        return {
            title: indexed.title,
            description: indexed.description,
            indexable: true,
            canonical: `${siteUrl}${indexed.path === '/' ? '/' : indexed.path}`,
        };
    }
    const unlisted = UNLISTED_PAGES.find((page) => page.path === normalized);

    return { title: unlisted?.title ?? SITE_NAME, description: DEFAULT_DESCRIPTION, indexable: false };
};
