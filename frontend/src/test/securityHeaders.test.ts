import { describe, expect, it } from 'vitest';
import { apiOrigin, cloudflareHeadersFile, contentSecurityPolicy } from '../../build/securityHeaders';

describe('Cloudflare security headers', () => {
    it('allows the API origin only, without its path or trailing slash', () => {
        expect(apiOrigin('https://api.example.test/')).toBe('https://api.example.test');
        expect(apiOrigin(' http://localhost:8080/v1 ')).toBe('http://localhost:8080');
        expect(contentSecurityPolicy('https://api.example.test/')).toContain("connect-src 'self' https://api.example.test;");
    });

    it('rejects an API URL that is not an absolute http(s) URL', () => {
        expect(() => apiOrigin('api.example.test')).toThrow('VITE_API_URL');
        expect(() => apiOrigin('javascript:alert(1)')).toThrow('VITE_API_URL');
    });

    it('allows Turnstile and blocks framing, plugins and foreign scripts', () => {
        const csp = contentSecurityPolicy('https://api.example.test');

        expect(csp).toContain("script-src 'self' https://challenges.cloudflare.com;");
        expect(csp).toContain('frame-src https://challenges.cloudflare.com;');
        expect(csp).toContain("frame-ancestors 'none'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).not.toContain('unsafe-eval');
    });

    it('applies the policy to every path and caches hashed assets for good', () => {
        const file = cloudflareHeadersFile('https://api.example.test', true);

        expect(file).toMatch(/^\/\*\n {2}Content-Security-Policy: default-src 'self';/);
        expect(file).toContain('  X-Frame-Options: DENY\n');
        expect(file).toContain('  Referrer-Policy: strict-origin-when-cross-origin\n');
        expect(file).toContain('/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
    });

    it('reports CSP violations without blocking until it is enforced', () => {
        expect(cloudflareHeadersFile('https://api.example.test', false)).toContain('  Content-Security-Policy-Report-Only: ');
        expect(cloudflareHeadersFile('https://api.example.test', false)).not.toContain('  Content-Security-Policy: ');
    });
});
