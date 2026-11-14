/**
 * Build-time rendering of the public pages (see build/prerender.ts and docs/seo.md).
 * Built with `vite build --ssr`; never loaded in the browser.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { SITE_URL } from './config';

export { INDEXED_PAGES, NOT_FOUND_TITLE, UNLISTED_PAGES, pageHead } from './seo/pages';
export { fillTemplate, headTags, llmsTxt, robotsTxt, sitemapXml } from './seo/documents';
export { SITE_URL };

/** The HTML a signed-out visitor sees at this path, before any script runs. */
export const render = (path: string): string => renderToString(
    <React.StrictMode>
        <StaticRouter location={path}>
            <App />
        </StaticRouter>
    </React.StrictMode>
);
