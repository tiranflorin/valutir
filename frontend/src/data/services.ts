import type { BillingInterval } from '../components/subscription-form/SubscriptionFormCard';

/**
 * Common subscriptions, to fill in the add form and the "Pick what you pay for" list.
 *
 * - `category` is one of the form's categories.
 * - `manageUrl` is the provider's account or subscription page, where you manage or cancel it. It
 *   is left out where that page depends on your country (Amazon, Audible) or the plan is managed in
 *   the provider's app only.
 * - There are no typical prices: they differ by country and change often, so the user types the
 *   price they pay.
 * - `icon` names a file in public/service-icons; without one, a letter tile is shown. Logos are
 *   never loaded from a third party (it would add a CSP origin and tell them what the user picks).
 */
export type CatalogService = {
    name: string;
    category: 'Entertainment' | 'Software' | 'Fitness' | 'Banking' | 'Utilities' | 'Cloud' | 'Other';
    cadence: BillingInterval;
    manageUrl?: string;
    icon?: string;
    /** Other names people type for it. */
    aliases?: string[];
};

/** Apple's own subscriptions are all managed from one page. */
const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';
const MICROSOFT_SERVICES = 'https://account.microsoft.com/services';
const GOOGLE_PLAY_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions';

export const SERVICE_CATALOG: CatalogService[] = [
    // Video and music
    { name: 'Netflix', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.netflix.com/account', icon: 'netflix' },
    { name: 'Disney+', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.disneyplus.com/account', aliases: ['disney plus'] },
    { name: 'Amazon Prime', category: 'Entertainment', cadence: 'yearly', aliases: ['prime video'] },
    { name: 'YouTube Premium', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.youtube.com/paid_memberships' },
    { name: 'Apple TV+', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, aliases: ['apple tv plus'] },
    { name: 'HBO Max', category: 'Entertainment', cadence: 'monthly', aliases: ['max'] },
    { name: 'Paramount+', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.paramountplus.com/account/', aliases: ['paramount plus'] },
    { name: 'Crunchyroll', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.crunchyroll.com/account/membership' },
    { name: 'DAZN', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Spotify', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.spotify.com/account/overview/', icon: 'spotify' },
    { name: 'Apple Music', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS },
    { name: 'YouTube Music', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.youtube.com/paid_memberships' },
    { name: 'Deezer', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Tidal', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://account.tidal.com/' },
    { name: 'Audible', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Kindle Unlimited', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Apple One', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS },
    { name: 'Patreon', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.patreon.com/settings/memberships' },

    // Games
    { name: 'Xbox Game Pass', category: 'Entertainment', cadence: 'monthly', manageUrl: MICROSOFT_SERVICES, icon: 'game-pass', aliases: ['game pass'] },
    { name: 'PlayStation Plus', category: 'Entertainment', cadence: 'yearly', aliases: ['ps plus'] },
    { name: 'Nintendo Switch Online', category: 'Entertainment', cadence: 'yearly' },
    { name: 'Apple Arcade', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS },

    // News and reading
    { name: 'The New York Times', category: 'Other', cadence: 'monthly', aliases: ['nyt'] },
    { name: 'The Economist', category: 'Other', cadence: 'yearly' },
    { name: 'Medium', category: 'Other', cadence: 'monthly', manageUrl: 'https://medium.com/me/settings/membership' },
    { name: 'Substack', category: 'Other', cadence: 'monthly', icon: 'newsletter' },

    // Software and AI
    { name: 'Microsoft 365', category: 'Software', cadence: 'yearly', manageUrl: MICROSOFT_SERVICES, icon: 'email-suite', aliases: ['office 365'] },
    { name: 'Adobe Creative Cloud', category: 'Software', cadence: 'monthly', manageUrl: 'https://account.adobe.com/plans', icon: 'adobe', aliases: ['photoshop', 'lightroom'] },
    { name: 'ChatGPT Plus', category: 'Software', cadence: 'monthly', manageUrl: 'https://chatgpt.com/', icon: 'chatgpt', aliases: ['openai'] },
    { name: 'Claude Pro', category: 'Software', cadence: 'monthly', manageUrl: 'https://claude.ai/settings/billing', aliases: ['anthropic'] },
    { name: 'GitHub', category: 'Software', cadence: 'monthly', manageUrl: 'https://github.com/settings/billing', icon: 'github' },
    { name: 'GitHub Copilot', category: 'Software', cadence: 'monthly', manageUrl: 'https://github.com/settings/copilot', icon: 'github' },
    { name: 'Cursor', category: 'Software', cadence: 'monthly', manageUrl: 'https://cursor.com/settings' },
    { name: 'JetBrains', category: 'Software', cadence: 'yearly', manageUrl: 'https://account.jetbrains.com/licenses', aliases: ['phpstorm', 'intellij'] },
    { name: 'Figma', category: 'Software', cadence: 'monthly', icon: 'figma' },
    { name: 'Canva', category: 'Software', cadence: 'yearly', manageUrl: 'https://www.canva.com/settings/billing-and-plans', icon: 'design-app' },
    { name: 'Notion', category: 'Software', cadence: 'monthly', icon: 'project-tool' },
    { name: 'Grammarly', category: 'Software', cadence: 'yearly', manageUrl: 'https://account.grammarly.com/subscription' },
    { name: 'Duolingo Super', category: 'Software', cadence: 'yearly', aliases: ['duolingo'] },
    { name: 'Zoom', category: 'Software', cadence: 'monthly', manageUrl: 'https://zoom.us/billing' },
    { name: 'Google Workspace', category: 'Software', cadence: 'monthly', manageUrl: 'https://admin.google.com/', icon: 'email-suite', aliases: ['g suite', 'gmail'] },
    { name: 'Slack', category: 'Software', cadence: 'monthly' },
    { name: 'Midjourney', category: 'Software', cadence: 'monthly', manageUrl: 'https://www.midjourney.com/account' },

    // Security and privacy
    { name: '1Password', category: 'Software', cadence: 'yearly', manageUrl: 'https://my.1password.com/' },
    { name: 'Bitwarden', category: 'Software', cadence: 'yearly', manageUrl: 'https://vault.bitwarden.com/' },
    { name: 'NordVPN', category: 'Software', cadence: 'yearly', manageUrl: 'https://my.nordaccount.com/', aliases: ['vpn'] },
    { name: 'Proton', category: 'Software', cadence: 'yearly', manageUrl: 'https://account.proton.me/', aliases: ['proton mail', 'proton vpn'] },

    // Cloud and storage
    { name: 'iCloud+', category: 'Cloud', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'icloud-plus', aliases: ['icloud'] },
    { name: 'Google One', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://one.google.com/', icon: 'cloud-storage', aliases: ['google drive storage'] },
    { name: 'Google Play subscription', category: 'Other', cadence: 'monthly', manageUrl: GOOGLE_PLAY_SUBSCRIPTIONS },
    { name: 'Dropbox', category: 'Cloud', cadence: 'yearly', manageUrl: 'https://www.dropbox.com/account/plan', icon: 'cloud-storage' },
    { name: 'AWS', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://console.aws.amazon.com/billing/', icon: 'cloud-hosting', aliases: ['amazon web services'] },
    { name: 'DigitalOcean', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://cloud.digitalocean.com/account/billing', icon: 'cloud-hosting' },
    { name: 'Hetzner', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://accounts.hetzner.com/', icon: 'cloud-hosting' },
    { name: 'Cloudflare', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://dash.cloudflare.com/', icon: 'cloud-hosting' },
    { name: 'Vercel', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://vercel.com/dashboard', icon: 'cloud-hosting' },
    { name: 'Domain name', category: 'Cloud', cadence: 'yearly', icon: 'domain', aliases: ['domain'] },

    // Fitness and health
    { name: 'Strava', category: 'Fitness', cadence: 'yearly', manageUrl: 'https://www.strava.com/account' },
    { name: 'Apple Fitness+', category: 'Fitness', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS },
    { name: 'Urban Sports Club', category: 'Fitness', cadence: 'monthly' },
    { name: 'Gym membership', category: 'Fitness', cadence: 'monthly', aliases: ['gym'] },
    { name: 'Headspace', category: 'Fitness', cadence: 'yearly' },
    { name: 'Calm', category: 'Fitness', cadence: 'yearly' },

    // Everyday
    { name: 'Mobile phone plan', category: 'Utilities', cadence: 'monthly', aliases: ['phone', 'mobile'] },
    { name: 'Home internet', category: 'Utilities', cadence: 'monthly', aliases: ['internet', 'broadband', 'wifi'] },
    { name: 'Bank account fee', category: 'Banking', cadence: 'monthly', aliases: ['bank'] },
];

const normalize = (value: string) => value.trim().toLowerCase();

/** The catalog entry with exactly this name (or alias), ignoring case. */
export const findCatalogService = (name: string): CatalogService | undefined => {
    const wanted = normalize(name);
    if (!wanted) return undefined;
    return SERVICE_CATALOG.find((service) =>
        normalize(service.name) === wanted || service.aliases?.some((alias) => normalize(alias) === wanted));
};

/** Entries whose name or an alias contains the query, names that start with it first. */
export const searchCatalog = (query: string): CatalogService[] => {
    const wanted = normalize(query);
    if (!wanted) return SERVICE_CATALOG;
    const matches = SERVICE_CATALOG.filter((service) =>
        normalize(service.name).includes(wanted) || service.aliases?.some((alias) => normalize(alias).includes(wanted)));
    return matches.sort((a, b) => Number(!normalize(a.name).startsWith(wanted)) - Number(!normalize(b.name).startsWith(wanted)));
};

/** The picture for a catalog entry: its own icon file, or null for a letter tile. */
export const catalogIconSrc = (service: CatalogService): string | null =>
    service.icon ? `/service-icons/${service.icon}.svg` : null;
