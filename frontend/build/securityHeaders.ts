/**
 * Builds the Cloudflare Pages `_headers` file for the production bundle.
 * vite.config.ts writes it to dist/_headers from VITE_API_URL, so the API origin in the CSP never
 * needs to be hard-coded.
 */

/**
 * The CSP starts in report-only mode: violations are logged in the browser console but nothing is
 * blocked. Click through the deployed app (login, Turnstile on the contact page, calendar), fix any
 * reports, then switch this to true. X-Frame-Options stays enforced meanwhile, because browsers
 * ignore frame-ancestors in a report-only policy.
 */
export const ENFORCE_CSP = false;

/** The origin (scheme://host[:port]) of an http(s) URL; throws for anything else. */
export const apiOrigin = (apiUrl: string): string => {
    let url: URL;
    try {
        url = new URL(apiUrl.trim());
    } catch {
        throw new Error(`VITE_API_URL must be an absolute http(s) URL, got "${apiUrl}".`);
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error(`VITE_API_URL must be an absolute http(s) URL, got "${apiUrl}".`);
    }

    return url.origin;
};

const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

export const contentSecurityPolicy = (apiUrl: string): string => [
    "default-src 'self'",
    `script-src 'self' ${TURNSTILE_ORIGIN}`,
    // MUI (Emotion) and FullCalendar inject <style> tags at runtime.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin(apiUrl)}`,
    `frame-src ${TURNSTILE_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

export const cloudflareHeadersFile = (apiUrl: string, enforceCsp: boolean = ENFORCE_CSP): string => [
    '/*',
    `  ${enforceCsp ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'}: ${contentSecurityPolicy(apiUrl)}`,
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    // Reset, email-confirm and unsubscribe links carry tokens in the query string: other sites get the origin only.
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
    '',
    // Vite content-hashes everything under /assets, so a file there never changes.
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
].join('\n');
