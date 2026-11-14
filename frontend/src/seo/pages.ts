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
    /** What the page is, for its JSON-LD (every page is also a schema.org WebPage). */
    schema?: 'SoftwareApplication' | 'WebApplication';
};

export type UnlistedPage = { path: string; title: string };

export const INDEXED_PAGES: IndexedPage[] = [
    {
        path: '/',
        title: 'ValuTir · Know what your subscriptions really cost',
        description: 'Stop paying for what you don’t use. See what your subscriptions cost a month and a year, get a reminder before each charge, and try the free calculator.',
        schema: 'SoftwareApplication',
        summary: 'What ValuTir does: a free cost calculator, then one list of subscriptions with trial end dates, a renewal calendar, reminders and Personal and Business views.',
    },
    {
        path: '/calculator',
        schema: 'WebApplication',
        title: 'Subscription cost calculator: your yearly total · ValuTir',
        description: 'Free subscription calculator: tick what you pay for, type each price and see your monthly, yearly and five-year cost. No sign-up; nothing leaves your browser.',
        summary: 'Free subscription cost calculator: monthly, yearly and five-year totals, by category. No sign-up; runs in the browser.',
    },
    {
        path: '/streaming-cost-calculator',
        schema: 'WebApplication',
        title: 'Streaming cost calculator · ValuTir',
        description: 'What do Netflix, Spotify, Disney+ and the rest cost you a year? Tick your streaming, music and gaming subscriptions and see the total. Free, no sign-up.',
        summary: 'Calculator for streaming, music and gaming subscriptions.',
    },
    {
        path: '/ai-tools-cost-calculator',
        schema: 'WebApplication',
        title: 'AI tools cost calculator · ValuTir',
        description: 'What does your AI stack cost? Add ChatGPT, Claude, Copilot, Cursor, Midjourney and other tools you pay for and see the monthly and yearly total. Free.',
        summary: 'Calculator for AI assistants, coding assistants and image tools.',
    },
    {
        path: '/software-cost-calculator',
        schema: 'WebApplication',
        title: 'Software and cloud cost calculator · ValuTir',
        description: 'Office suites, design tools, password managers, hosting and domains: add the software you pay for and see your monthly and yearly bill. Free, no sign-up.',
        summary: 'Calculator for software, SaaS and cloud costs, for freelancers and small teams.',
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
    /** The normalized path. */
    path: string;
    schema?: IndexedPage['schema'];
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
            path: indexed.path,
            schema: indexed.schema,
        };
    }
    const unlisted = UNLISTED_PAGES.find((page) => page.path === normalized);

    return { title: unlisted?.title ?? SITE_NAME, description: DEFAULT_DESCRIPTION, indexable: false, path: normalized };
};
