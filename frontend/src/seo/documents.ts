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

const OFFERS = [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'EUR', description: 'Up to 50 active subscriptions.' },
    {
        '@type': 'Offer',
        name: 'One-time unlock',
        price: LEGAL.unlockPrice.replace(/[^0-9.]/g, ''),
        priceCurrency: 'EUR',
        description: 'More than 50 active subscriptions. Paid once, VAT included.',
    },
];

/**
 * JSON-LD for an indexed page: always a WebPage on the ValuTir WebSite, plus what the page is.
 * The home page describes the app and its prices; a calculator page describes a free web tool.
 */
export const structuredData = (head: PageHead, siteUrl: string) => {
    const website = { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: SITE_NAME, url: `${siteUrl}/`, publisher: { '@id': `${siteUrl}/#organization` } };
    const organization = { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: LEGAL.legalName, address: LEGAL.address, url: `${siteUrl}/` };
    const webpage = {
        '@type': 'WebPage',
        '@id': `${head.canonical}#webpage`,
        url: head.canonical,
        name: head.title,
        description: head.description,
        inLanguage: 'en',
        isPartOf: { '@id': `${siteUrl}/#website` },
    };
    const graph: Record<string, unknown>[] = [website, organization, webpage];
    if (head.schema === 'SoftwareApplication') graph.push(softwareApplication(siteUrl));
    if (head.schema === 'WebApplication') {
        graph.push({
            '@type': 'WebApplication',
            name: head.title.replace(/ · ValuTir$/, ''),
            url: head.canonical,
            description: head.description,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            provider: { '@id': `${siteUrl}/#organization` },
        });
    }

    return { '@context': 'https://schema.org', '@graph': graph };
};

/** The product itself: what it is and what it costs. */
const softwareApplication = (siteUrl: string) => ({
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: `${siteUrl}/`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: INDEXED_PAGES[0].description,
    offers: OFFERS,
    publisher: { '@id': `${siteUrl}/#organization` },
});

/** The tags that replace the template's <title>. */
export const headTags = (head: PageHead, siteUrl: string): string => {
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
    if (head.indexable && head.canonical) {
        tags.push(`<script type="application/ld+json">${jsonForScript(structuredData(head, siteUrl))}</script>`);
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
    `- A free subscription cost calculator (${siteUrl}/calculator) works without an account: monthly, yearly and five-year totals by category. It runs in the browser; nothing typed there is sent to the server.`,
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

/** Fewer words than this in <main> reads as an empty page to search engines and AI tools. */
export const MIN_MAIN_WORDS = 60;
export const TITLE_MAX = 70;
export const DESCRIPTION_RANGE = [50, 170] as const;

const textOf = (html: string) => html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Everything wrong with a prerendered public page against the contract in AGENTS.md ("Public
 * pages"): what search engines and AI tools need to understand it without running JavaScript.
 * An empty list means it passes. The build (build/prerender.ts) and test/seo.test.tsx both use it.
 */
export const publicPageProblems = (html: string, head: PageHead): string[] => {
    const problems: string[] = [];
    const [headHtml, bodyHtml = ''] = html.split('<body>');
    const expect = (ok: boolean, problem: string) => { if (!ok) problems.push(problem); };

    expect(headHtml.includes(`<title>${escapeHtml(head.title)}</title>`), 'title is missing or not the one in src/seo/pages.ts');
    expect(head.title.length <= TITLE_MAX, `title is longer than ${TITLE_MAX} characters`);
    expect(headHtml.includes(`<meta name="description" content="${escapeHtml(head.description)}" />`), 'meta description is missing');
    expect(head.description.length >= DESCRIPTION_RANGE[0] && head.description.length <= DESCRIPTION_RANGE[1], `description should be ${DESCRIPTION_RANGE[0]}-${DESCRIPTION_RANGE[1]} characters`);
    expect(headHtml.includes('<meta name="robots" content="index, follow" />'), 'robots meta is not "index, follow"');
    expect(!!head.canonical && headHtml.includes(`<link rel="canonical" href="${escapeHtml(head.canonical)}" />`), 'canonical link is missing');
    expect(/<script type="application\/ld\+json">[\s\S]*"WebPage"/.test(headHtml), 'JSON-LD WebPage is missing');
    expect(!/<style[\s>]/.test(bodyHtml), '<style> tags in the body (they belong in <head>)');

    const mains = bodyHtml.match(/<main[\s>][\s\S]*?<\/main>/g) ?? [];
    expect(mains.length === 1, `expected one <main> landmark, found ${mains.length}`);
    expect((bodyHtml.match(/<h1[\s>]/g) ?? []).length === 1, 'expected exactly one <h1>');
    if (mains.length === 1) {
        expect(/<h1[\s>]/.test(mains[0]), 'the <h1> must be inside <main>');
        const words = textOf(mains[0]).split(' ').filter(Boolean).length;
        expect(words >= MIN_MAIN_WORDS, `<main> has ${words} words of text; at least ${MIN_MAIN_WORDS} are needed`);
    }

    return problems;
};

/**
 * Cloudflare Pages `_redirects`: "/plans/" → "/plans" for every indexed page, so a trailing slash
 * never serves another page or a 404, and search engines see one URL per page.
 */
export const redirectsFile = (): string => [
    '# Generated by build/prerender.ts from src/seo/pages.ts: one URL per public page.',
    ...INDEXED_PAGES.filter((page) => page.path !== '/').map((page) => `${page.path}/ ${page.path} 301`),
    '',
].join('\n');
