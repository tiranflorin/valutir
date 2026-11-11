/** Longest link the API stores. */
export const MANAGE_URL_MAX = 2048;

const parse = (value: string): URL | null => {
    try {
        return new URL(value);
    } catch {
        return null;
    }
};

/**
 * Why a "manage or cancel" link can't be saved, or null when it can (empty is fine). Mirrors the
 * API: https only, with a real domain, at most 2048 characters.
 */
export const manageUrlError = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > MANAGE_URL_MAX) return `Use a link of at most ${MANAGE_URL_MAX} characters.`;
    const url = parse(trimmed);
    if (!url || url.protocol !== 'https:' || !url.hostname.includes('.')) {
        return 'Use a full https:// link, e.g. https://www.netflix.com/account';
    }
    return null;
};

/**
 * The link to show, or null. Checked again before rendering, so a stored value that isn't an
 * https link never becomes a clickable javascript: or http: link.
 */
export const safeManageUrl = (value: string | null | undefined): string | null => {
    if (!value || manageUrlError(value) !== null) return null;
    return value.trim();
};
