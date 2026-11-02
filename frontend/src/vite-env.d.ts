/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Base URL of the Symfony API, e.g. http://localhost:8080. Required for production builds. */
    readonly VITE_API_URL?: string;
    /** Cloudflare Turnstile site key for the contact form. */
    readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
