import { afterEach, describe, expect, it, vi } from 'vitest';

const loadApiUrl = async () => {
    vi.resetModules();
    return (await import('../config')).API_URL;
};

describe('API_URL', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses VITE_API_URL without a trailing slash', async () => {
        vi.stubEnv('VITE_API_URL', ' https://api.example.test/ ');

        expect(await loadApiUrl()).toBe('https://api.example.test');
    });

    it('falls back to the local backend outside production builds', async () => {
        vi.stubEnv('VITE_API_URL', '');

        expect(await loadApiUrl()).toBe('http://localhost:8080');
    });
});
