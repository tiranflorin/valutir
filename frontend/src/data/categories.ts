/**
 * The categories a subscription can have: the add and edit forms, the calculator, the catalog
 * (data/services.ts) and the Insights breakdown all use this list.
 */
export const CATEGORIES = [
    'Video streaming',
    'Music & audiobooks',
    'Gaming',
    'News & reading',
    'AI tools',
    'Office & productivity',
    'CRM & sales',
    'Design & creative',
    'Dev & hosting',
    'Cloud storage',
    'Security & VPN',
    'Learning',
    'Health & fitness',
    'Shopping & delivery',
    'Social & dating',
    'Phone & internet',
    'Banking & finance',
    'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * The broader categories used until 18 November 2026. Subscriptions with a custom name may still
 * have one (they weren't moved, since the right new category can't be told), and so may shared
 * calculator links and saved calculator lists from before, so they stay valid where they're read.
 */
export const LEGACY_CATEGORIES = ['Entertainment', 'Software', 'Fitness', 'Banking', 'Utilities', 'Cloud'] as const;

export const isKnownCategory = (value: string): boolean =>
    (CATEGORIES as readonly string[]).includes(value) || (LEGACY_CATEGORIES as readonly string[]).includes(value);
