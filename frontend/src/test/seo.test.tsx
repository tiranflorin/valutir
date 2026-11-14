import { describe, expect, it } from 'vitest';
import { render } from '../entry-server';
import { disallowedPaths, fillTemplate, headTags, llmsTxt, robotsTxt, sitemapXml } from '../seo/documents';
import { INDEXED_PAGES, UNLISTED_PAGES, pageHead } from '../seo/pages';
import appSource from '../App.tsx?raw';

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
        const plans = headTags(pageHead('/plans', SITE), SITE, '/plans');
        expect(plans).toContain('<meta name="robots" content="index, follow" />');
        expect(plans).toContain(`<link rel="canonical" href="${SITE}/plans" />`);
        expect(plans).toContain('og:title');

        const mySubs = headTags(pageHead('/my-subs', SITE), SITE, '/my-subs');
        expect(mySubs).toContain('noindex, nofollow');
        expect(mySubs).not.toContain('canonical');
        expect(mySubs).not.toContain('og:title');
    });

    it('treats a trailing slash as the same page and an unknown path as unlisted', () => {
        expect(pageHead('/plans/', SITE).canonical).toBe(`${SITE}/plans`);
        expect(pageHead('/subscriptions/12', SITE).indexable).toBe(false);
    });

    it('adds structured data to the home page only, safe inside a script tag', () => {
        const home = headTags(pageHead('/', SITE), SITE, '/');
        const json = home.match(/<script type="application\/ld\+json">(.*)<\/script>/)?.[1];
        expect(JSON.parse(json!)).toMatchObject({ '@type': 'SoftwareApplication', url: `${SITE}/` });
        expect(json).not.toContain('<');
        expect(headTags(pageHead('/plans', SITE), SITE, '/plans')).not.toContain('ld+json');
    });

    it('escapes text in attributes', () => {
        const tags = headTags({ title: 'A <b> & "c"', description: 'd"e', indexable: false }, SITE, '/x');
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

describe('prerendering', () => {
    it.each(INDEXED_PAGES.map((page) => page.path))('renders %s with a heading for signed-out visitors', (path) => {
        expect(render(path)).toMatch(/<h1[\s>]/);
    });
});
