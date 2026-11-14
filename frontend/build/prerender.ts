/**
 * Turns the client build in dist/ into pages crawlers can read without running JavaScript.
 * Runs after `vite build` and `vite build --ssr src/entry-server.tsx --outDir dist-ssr` (npm run build).
 *
 * - Every page in INDEXED_PAGES (src/seo/pages.ts) becomes real HTML: dist/index.html, dist/plans.html, ...
 *   Cloudflare Pages serves dist/plans.html at /plans. Each must pass the public page contract
 *   (publicPageProblems, AGENTS.md "Public pages"), or the build fails.
 * - Every page in UNLISTED_PAGES becomes an empty, noindex page that the app fills in the browser.
 * - dist/404.html is the same empty page for every other path (/subscriptions/12, typos). Its 404
 *   status keeps unknown URLs out of search results; in the browser the app still opens normally.
 * - robots.txt, sitemap.xml, llms.txt and _redirects are generated from the same list.
 *
 * See docs/seo.md.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type PageHead = { title: string; description: string; indexable: boolean; canonical?: string; path: string };

/** What src/entry-server.tsx exports (it is bundled separately, so its types aren't imported here). */
type ServerEntry = {
    SITE_URL: string;
    INDEXED_PAGES: { path: string }[];
    UNLISTED_PAGES: { path: string }[];
    pageHead: (path: string, siteUrl: string) => PageHead;
    renderPage: (template: string, path: string) => string;
    renderNotFound: (template: string) => string;
    publicPageProblems: (html: string, head: PageHead) => string[];
    robotsTxt: (siteUrl: string) => string;
    sitemapXml: (siteUrl: string) => string;
    llmsTxt: (siteUrl: string) => string;
    redirectsFile: () => string;
};

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const entry = (await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href)) as ServerEntry;

/** "/" → index.html, "/plans" → plans.html, "/subscriptions/new" → subscriptions/new.html */
const fileFor = (path: string) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);

const paths = [...entry.INDEXED_PAGES, ...entry.UNLISTED_PAGES].map((page) => page.path);
// A page file next to a folder of the same name (/calculator.html and /calculator/...) leaves it to
// the host which one /calculator serves. Keep every page path free of that clash.
const clash = paths.find((path) => path !== '/' && paths.some((other) => other.startsWith(`${path}/`)));
if (clash) {
    throw new Error(`${clash} is both a page and a folder of other pages. Give the nested pages their own top-level path.`);
}

const write = (file: string, content: string) => {
    const target = join(dist, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    console.log(`  prerendered ${file}`);
};

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const failures: string[] = [];

for (const { path } of entry.INDEXED_PAGES) {
    const html = entry.renderPage(template, path);
    const problems = entry.publicPageProblems(html, entry.pageHead(path, entry.SITE_URL));
    failures.push(...problems.map((problem) => `${path}: ${problem}`));
    write(fileFor(path), html);
}
if (failures.length) {
    throw new Error(`Public pages break the contract in AGENTS.md ("Public pages"):\n  ${failures.join('\n  ')}`);
}

for (const { path } of entry.UNLISTED_PAGES) {
    write(fileFor(path), entry.renderPage(template, path));
}
write('404.html', entry.renderNotFound(template));

write('robots.txt', entry.robotsTxt(entry.SITE_URL));
write('sitemap.xml', entry.sitemapXml(entry.SITE_URL));
write('llms.txt', entry.llmsTxt(entry.SITE_URL));
write('_redirects', entry.redirectsFile());
