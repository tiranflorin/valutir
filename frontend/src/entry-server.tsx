/**
 * Server-side rendering of the public pages for search engines and AI crawlers (docs/seo.md).
 * Used by `npm run build` (build/prerender.ts) and by the dev server (vite.config.ts), so both
 * serve the same HTML. Never loaded in the browser.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { SITE_URL } from './config';
import { fillTemplate, headTags } from './seo/documents';
import { NOT_FOUND_TITLE, pageHead } from './seo/pages';

export { INDEXED_PAGES, UNLISTED_PAGES, pageHead } from './seo/pages';
export { llmsTxt, publicPageProblems, redirectsFile, robotsTxt, sitemapXml } from './seo/documents';
export { SITE_URL };

/** The HTML a signed-out visitor sees at this path, before any script runs. */
export const render = (path: string): string => renderToString(
    <React.StrictMode>
        <StaticRouter location={path}>
            <App />
        </StaticRouter>
    </React.StrictMode>
);

/**
 * The whole document for a path: an indexed page with its content, anything else as an empty
 * noindex page that the app fills in the browser.
 */
export const renderPage = (template: string, path: string): string => {
    const head = pageHead(path, SITE_URL);

    return fillTemplate(template, headTags(head, SITE_URL), head.indexable ? render(head.path) : '');
};

/** dist/404.html: the app shell, noindex, for every path without a file. */
export const renderNotFound = (template: string): string =>
    fillTemplate(template, headTags({ ...pageHead('/404', SITE_URL), title: NOT_FOUND_TITLE, indexable: false }, SITE_URL));
