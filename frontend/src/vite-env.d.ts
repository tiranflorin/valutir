/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Base URL of the Symfony API, e.g. http://localhost:8080. Required for production builds. */
    readonly VITE_API_URL?: string;
    /** Cloudflare Turnstile site key for the contact form. */
    readonly VITE_TURNSTILE_SITE_KEY?: string;
    /** Public origin of the app for canonical links and the sitemap. Defaults to https://valutir.app. */
    readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
