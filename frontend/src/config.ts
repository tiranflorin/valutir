/**
 * Runtime configuration, read once from Vite's build-time environment.
 * Import API_URL from here instead of reading import.meta.env in components.
 */
const DEVELOPMENT_API_URL = 'http://localhost:8080';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

/**
 * Base URL of the Symfony API, without a trailing slash. Production builds must set
 * VITE_API_URL (vite.config.ts fails the build otherwise); dev and tests fall back to the local backend.
 */
export const API_URL = (configuredApiUrl || (import.meta.env.PROD ? '' : DEVELOPMENT_API_URL)).replace(/\/+$/, '');
