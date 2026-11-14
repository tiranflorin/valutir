/**
 * The text files and <head> tags that tell search engines and AI crawlers about ValuTir.
 * build/prerender.ts writes them into dist/ at build time; they are plain functions so tests can check them.
 */
import { LEGAL } from '../legal';
import { INDEXED_PAGES, PRIVATE_PREFIXES, SITE_NAME, UNLISTED_PAGES, pageHead, type PageHead } from './pages';

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** JSON inside <script type="application/ld+json">: "<" escaped, so no "</script>" can end it early. */
const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/** Structured data for the home page: what the product is and what it costs. */
const softwareApplication = (siteUrl: string) => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: `${siteUrl}/`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: INDEXED_PAGES[0].description,
    offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'EUR', description: 'Up to 50 active subscriptions.' },
        {
            '@type': 'Offer',
            name: 'One-time unlock',
            price: LEGAL.unlockPrice.replace(/[^0-9.]/g, ''),
            priceCurrency: 'EUR',
            description: 'More than 50 active subscriptions. Paid once, VAT included.',
        },
    ],
    publisher: { '@type': 'Organization', name: LEGAL.legalName, address: LEGAL.address },
});

/** The tags that replace the template's <title>. */
export const headTags = (head: PageHead, siteUrl: string, path: string): string => {
    const tags = [
        `<title>${escapeHtml(head.title)}</title>`,
        `<meta name="description" content="${escapeHtml(head.description)}" />`,
        `<meta name="robots" content="${head.indexable ? 'index, follow' : 'noindex, nofollow'}" />`,
    ];
    if (head.indexable && head.canonical) {
        tags.push(
            `<link rel="canonical" href="${escapeHtml(head.canonical)}" />`,
            `<meta property="og:type" content="website" />`,
            `<meta property="og:site_name" content="${SITE_NAME}" />`,
            `<meta property="og:title" content="${escapeHtml(head.title)}" />`,
            `<meta property="og:description" content="${escapeHtml(head.description)}" />`,
            `<meta property="og:url" content="${escapeHtml(head.canonical)}" />`,
            `<meta name="twitter:card" content="summary" />`,
        );
    }
    if (path === '/') {
        tags.push(`<script type="application/ld+json">${jsonForScript(softwareApplication(siteUrl))}</script>`);
    }

    return tags.join('\n    ');
};

const EMOTION_STYLE = /<style data-emotion="[^"]*">[\s\S]*?<\/style>/g;

/**
 * Fills the built index.html with a page's head tags and, for prerendered pages, its HTML.
 * Emotion writes each component's <style> next to it; they move into <head>, so the body holds only
 * content (crawlers that strip tags would otherwise read CSS as text). The app picks them up there.
 */
export const fillTemplate = (template: string, head: string, appHtml = ''): string => {
    if (!/<title>[\s\S]*?<\/title>/.test(template) || !template.includes('<div id="root"></div>')) {
        throw new Error('index.html must contain a <title> and an empty <div id="root"></div>.');
    }
    const styles = [...new Set(appHtml.match(EMOTION_STYLE) ?? [])];
    const body = appHtml.replace(EMOTION_STYLE, '');

    return template
        .replace(/<title>[\s\S]*?<\/title>/, () => [head, ...styles].join('\n    '))
        .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
};

/** Paths crawlers must not fetch: signed-in screens and token links (a path already covered by a shorter one is left out). */
export const disallowedPaths = (): string[] => {
    const paths = [...new Set([...UNLISTED_PAGES.map((page) => page.path), ...PRIVATE_PREFIXES])];

    return paths.filter((path) => !paths.some((other) => other !== path && path.startsWith(other))).sort();
};

export const robotsTxt = (siteUrl: string): string => [
    '# ValuTir\'s public pages are open to every crawler: search engines and AI assistants alike.',
    '# Signed-in screens and links from emails (they carry one-time tokens) are kept out.',
    'User-agent: *',
    'Allow: /',
    ...disallowedPaths().map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
].join('\n');

export const sitemapXml = (siteUrl: string): string => [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...INDEXED_PAGES.map((page) => `  <url><loc>${escapeHtml(pageHead(page.path, siteUrl).canonical!)}</loc></url>`),
    '</urlset>',
    '',
].join('\n');

/** https://llmstxt.org: a short Markdown overview for AI assistants. */
export const llmsTxt = (siteUrl: string): string => [
    `# ${SITE_NAME}`,
    '',
    '> ValuTir is a web app for tracking subscriptions and recurring expenses: what each one costs a month and a year, when it renews, when a free trial ends, and a reminder email before the charge.',
    '',
    `- Free for up to 50 active subscriptions. A one-time ${LEGAL.unlockPrice} unlock (VAT included) lifts the limit; there is no monthly fee.`,
    '- Subscriptions are entered by hand or picked from a list of common services. No bank connection.',
    '- Personal and Business views, a renewal calendar, cost by category, a keep-or-cancel review, and household sharing that splits a bill.',
    '- ValuTir reminds and organizes; cancelling is done with the provider.',
    '- Users can download all their data (JSON, CSV) and delete their account at any time.',
    `- Operated by ${LEGAL.legalName}, ${LEGAL.address}.`,
    '',
    '## Pages',
    '',
    ...INDEXED_PAGES.map((page) => `- [${page.title.replace(/ · ValuTir$/, '')}](${pageHead(page.path, siteUrl).canonical}): ${page.summary}`),
    '',
].join('\n');
