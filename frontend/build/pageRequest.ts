/**
 * Whether the dev server should answer a request with a rendered page (vite.config.ts,
 * devPageRendering). Decided by method and path only, like the production host: crawlers, AI
 * fetchers and curl often send `Accept: *\/*` or no Accept header, and must get the same HTML as a browser.
 */
export const isPageRequest = (method: string | undefined, path: string): boolean =>
    (method === 'GET' || method === 'HEAD')
    // Files (/assets/x.js, /favicon.svg, /robots.txt) and Vite's own module and HMR paths pass through.
    && !/\.[a-z0-9]+$/i.test(path)
    && !/^\/(@|src\/|node_modules\/|__)/.test(path);
