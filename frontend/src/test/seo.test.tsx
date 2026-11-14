import { describe, expect, it } from 'vitest';
import { render, renderPage } from '../entry-server';
import { disallowedPaths, fillTemplate, headTags, llmsTxt, publicPageProblems, redirectsFile, robotsTxt, sitemapXml } from '../seo/documents';
import { INDEXED_PAGES, UNLISTED_PAGES, pageHead } from '../seo/pages';
import appSource from '../App.tsx?raw';
import { isPageRequest } from '../../build/pageRequest';

const SITE = 'https://example.test';
const TEMPLATE = '<html><head><title>Old</title></head><body><div id="root"></div></body></html>';

const appRoutePaths = () => [...appSource.matchAll(/path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== '*' && !path.includes(':'));

describe('which pages crawlers see', () => {
    it('lists every route in App.tsx as indexed or unlisted, once', () => {
        const listed = [...INDEXED_PAGES, ...UNLISTED_PAGES].map((page) => page.path);
        expect(new Set(listed).size).toBe(listed.length);
        expect([...appRoutePaths()].sort()).toEqual([...listed].sort());
    });

    it('keeps crawlers out of every unlisted page and parameter route, and never out of an indexed page', () => {
        const blocked = (path: string) => disallowedPaths().some((rule) => path.startsWith(rule));
        for (const page of UNLISTED_PAGES) expect(blocked(page.path), page.path).toBe(true);
        expect(blocked('/subscriptions/12')).toBe(true);
        expect(blocked('/calendar/day/2026-11-14')).toBe(true);
        for (const page of INDEXED_PAGES) expect(blocked(page.path), page.path).toBe(false);
    });

    it('writes robots.txt, the sitemap and llms.txt from the same list', () => {
        const robots = robotsTxt(SITE);
        expect(robots).toContain('User-agent: *\nAllow: /');
        expect(robots).toContain('Disallow: /my-subs');
        expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);

        const sitemap = sitemapXml(SITE);
        const llms = llmsTxt(SITE);
        for (const page of INDEXED_PAGES) {
            const url = page.path === '/' ? `${SITE}/` : `${SITE}${page.path}`;
            expect(sitemap).toContain(`<loc>${url}</loc>`);
            expect(llms).toContain(`(${url})`);
        }
        expect(sitemap).not.toContain('/my-subs');
    });
});

describe('page head', () => {
    it('gives an indexed page a canonical link and social tags, and an unlisted one noindex only', () => {
        const plans = headTags(pageHead('/plans', SITE), SITE);
        expect(plans).toContain('<meta name="robots" content="index, follow" />');
        expect(plans).toContain(`<link rel="canonical" href="${SITE}/plans" />`);
        expect(plans).toContain('og:title');

        const mySubs = headTags(pageHead('/my-subs', SITE), SITE);
        expect(mySubs).toContain('noindex, nofollow');
        expect(mySubs).not.toContain('canonical');
        expect(mySubs).not.toContain('og:title');
    });

    it('treats a trailing slash as the same page and an unknown path as unlisted', () => {
        expect(pageHead('/plans/', SITE).canonical).toBe(`${SITE}/plans`);
        expect(pageHead('/subscriptions/12', SITE).indexable).toBe(false);
    });

    const jsonLd = (path: string) => {
        const json = headTags(pageHead(path, SITE), SITE).match(/<script type="application\/ld\+json">(.*)<\/script>/)?.[1];
        expect(json).not.toContain('<');
        return JSON.parse(json!) as { '@graph': { '@type': string; url?: string }[] };
    };

    it('describes every indexed page in JSON-LD, the app on the home page and a free tool on calculators', () => {
        const types = (path: string) => jsonLd(path)['@graph'].map((node) => node['@type']);
        expect(types('/plans')).toEqual(['WebSite', 'Organization', 'WebPage']);
        expect(types('/')).toContain('SoftwareApplication');
        expect(jsonLd('/calculator')['@graph'].find((node) => node['@type'] === 'WebApplication')).toMatchObject({ url: `${SITE}/calculator`, isAccessibleForFree: true });
        expect(headTags(pageHead('/my-subs', SITE), SITE)).not.toContain('ld+json');
    });

    it('escapes text in attributes', () => {
        const tags = headTags({ title: 'A <b> & "c"', description: 'd"e', indexable: false, path: '/x' }, SITE);
        expect(tags).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>');
        expect(tags).toContain('content="d&quot;e"');
    });
});

describe('filling the template', () => {
    it('puts the head tags in place of the title, the page in the root, and Emotion styles in the head', () => {
        const html = fillTemplate(TEMPLATE, '<title>New</title>', '<style data-emotion="css a">.a{}</style><h1>Hi</h1><style data-emotion="css a">.a{}</style>');
        expect(html).toBe('<html><head><title>New</title>\n    <style data-emotion="css a">.a{}</style></head><body><div id="root"><h1>Hi</h1></div></body></html>');
    });

    it('refuses a template without a root element', () => {
        expect(() => fillTemplate('<title>x</title>', '')).toThrow(/root/);
    });
});

describe('the public page contract (AGENTS.md, "Public pages")', () => {
    // The same template shape as the built index.html.
    const template = '<!doctype html><html lang="en"><head><title>x</title></head><body><div id="root"></div></body></html>';

    it.each(INDEXED_PAGES.map((page) => page.path))('%s passes', (path) => {
        const html = renderPage(template, path);
        // Rendered in jsdom here, so Emotion keeps its styles in the document instead of the HTML.
        expect(publicPageProblems(html, pageHead(path, 'https://valutir.app'))).toEqual([]);
    });

    it('gives every indexed page its own title and description', () => {
        expect(new Set(INDEXED_PAGES.map((page) => page.title)).size).toBe(INDEXED_PAGES.length);
        expect(new Set(INDEXED_PAGES.map((page) => page.description)).size).toBe(INDEXED_PAGES.length);
    });

    it('keeps page paths clear of folders of other pages', () => {
        const paths = [...INDEXED_PAGES, ...UNLISTED_PAGES].map((page) => page.path);
        paths.filter((path) => path !== '/').forEach((path) => {
            expect(paths.filter((other) => other.startsWith(`${path}/`)), path).toEqual([]);
        });
    });

    it('reports what is missing', () => {
        const problems = publicPageProblems('<html><head></head><body><div><h1>A</h1><h1>B</h1></div></body></html>', pageHead('/plans', SITE));
        expect(problems).toEqual(expect.arrayContaining([
            'title is missing or not the one in src/seo/pages.ts',
            'canonical link is missing',
            'JSON-LD WebPage is missing',
            'expected one <main> landmark, found 0',
            'expected exactly one <h1>',
        ]));
    });

    it('renders a signed-in or token page as an empty noindex shell', () => {
        const html = renderPage(template, '/reset-password');
        expect(html).toContain('<div id="root"></div>');
        expect(html).toContain('noindex, nofollow');
        expect(render('/plans')).toMatch(/<h1[\s>]/);
    });

    it('redirects a trailing slash to the one URL of each page', () => {
        expect(redirectsFile()).toContain('/plans/ /plans 301');
        expect(redirectsFile()).not.toMatch(/^\/\/ /m);
    });
});

describe('dev server page requests', () => {
    it('renders pages whatever the Accept header, as crawlers and curl send none or */*', () => {
        ['/', '/calculator', '/plans', '/subscriptions/12'].forEach((path) => expect(isPageRequest('GET', path), path).toBe(true));
        expect(isPageRequest('HEAD', '/plans')).toBe(true);
    });

    it('leaves files, Vite modules and other methods alone', () => {
        ['/src/main.tsx', '/@vite/client', '/@react-refresh', '/node_modules/.vite/deps/react.js', '/favicon.svg', '/assets/index.js'].forEach((path) =>
            expect(isPageRequest('GET', path), path).toBe(false));
        expect(isPageRequest('POST', '/contact')).toBe(false);
    });
});
