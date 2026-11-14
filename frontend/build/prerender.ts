/**
 * Turns the client build in dist/ into pages crawlers can read without running JavaScript.
 * Runs after `vite build` and `vite build --ssr src/entry-server.tsx --outDir dist-ssr` (npm run build).
 *
 * - Every page in INDEXED_PAGES (src/seo/pages.ts) becomes real HTML: dist/index.html, dist/plans.html, ...
 *   Cloudflare Pages serves dist/plans.html at /plans.
 * - Every page in UNLISTED_PAGES becomes an empty, noindex page that the app fills in the browser.
 * - dist/404.html is the same empty page for every other path (/subscriptions/12, typos). Its 404
 *   status keeps unknown URLs out of search results; in the browser the app still opens normally.
 * - robots.txt, sitemap.xml and llms.txt are generated from the same list.
 *
 * See docs/seo.md.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type PageHead = { title: string; description: string; indexable: boolean; canonical?: string };

/** What src/entry-server.tsx exports (it is bundled separately, so its types aren't imported here). */
type ServerEntry = {
    SITE_URL: string;
    INDEXED_PAGES: { path: string }[];
    UNLISTED_PAGES: { path: string }[];
    NOT_FOUND_TITLE: string;
    pageHead: (path: string, siteUrl: string) => PageHead;
    headTags: (head: PageHead, siteUrl: string, path: string) => string;
    fillTemplate: (template: string, head: string, appHtml?: string) => string;
    robotsTxt: (siteUrl: string) => string;
    sitemapXml: (siteUrl: string) => string;
    llmsTxt: (siteUrl: string) => string;
    render: (path: string) => string;
};

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const entry = (await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href)) as ServerEntry;

/** "/" → index.html, "/plans" → plans.html, "/subscriptions/new" → subscriptions/new.html */
const fileFor = (path: string) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);

const write = (file: string, content: string) => {
    const target = join(dist, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    console.log(`  prerendered ${file}`);
};

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const siteUrl = entry.SITE_URL;

for (const { path } of entry.INDEXED_PAGES) {
    const html = entry.render(path);
    // A page that renders no heading has lost its content (an error page, a redirect): stop the build.
    if (!/<h1[\s>]/.test(html)) {
        throw new Error(`Prerendering ${path} produced no <h1>. Is the page still public, and does it render without a browser?`);
    }
    write(fileFor(path), entry.fillTemplate(template, entry.headTags(entry.pageHead(path, siteUrl), siteUrl, path), html));
}

for (const { path } of entry.UNLISTED_PAGES) {
    write(fileFor(path), entry.fillTemplate(template, entry.headTags(entry.pageHead(path, siteUrl), siteUrl, path)));
}

const notFound: PageHead = { ...entry.pageHead('/404', siteUrl), title: entry.NOT_FOUND_TITLE, indexable: false };
write('404.html', entry.fillTemplate(template, entry.headTags(notFound, siteUrl, '/404')));

write('robots.txt', entry.robotsTxt(siteUrl));
write('sitemap.xml', entry.sitemapXml(siteUrl));
write('llms.txt', entry.llmsTxt(siteUrl));
