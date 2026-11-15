import type { PaletteMode } from '@mui/material';

// public/theme-mode.js reads the same key before the first paint; keep them in sync.
export const THEME_MODE_KEY = 'valutir_theme_mode';

/** How long dark mode is remembered after the last visit; after that the app opens light again. */
export const THEME_MODE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * The mode to open with: dark only when it was chosen within the last 12 hours. Light is the default
 * and is never stored. Each visit in dark mode renews the 12 hours.
 */
export const readThemeMode = (now = Date.now()): PaletteMode => {
    if (typeof window === 'undefined') return 'light';
    try {
        const until = Number(window.localStorage.getItem(THEME_MODE_KEY));
        if (until > now) {
            window.localStorage.setItem(THEME_MODE_KEY, String(now + THEME_MODE_TTL_MS));
            return 'dark';
        }
        window.localStorage.removeItem(THEME_MODE_KEY);
    } catch {
        // Storage blocked: open light.
    }
    return 'light';
};

export const saveThemeMode = (mode: PaletteMode, now = Date.now()): void => {
    try {
        if (mode === 'dark') {
            window.localStorage.setItem(THEME_MODE_KEY, String(now + THEME_MODE_TTL_MS));
        } else {
            window.localStorage.removeItem(THEME_MODE_KEY);
        }
    } catch {
        // Storage blocked: the mode lasts until the page is reloaded.
    }
};
