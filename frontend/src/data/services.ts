import type { BillingInterval } from '../components/subscription-form/SubscriptionFormCard';
import type { Category } from './categories';

/**
 * Common subscriptions, to fill in the add form and the "Pick what you pay for" list.
 *
 * - `category` is one of data/categories.ts.
 * - `manageUrl` is the provider's account or subscription page, where you manage or cancel it. It
 *   is left out where that page depends on your country (Amazon, Audible) or the plan is managed in
 *   the provider's app only.
 * - There are no typical prices: they differ by country and change often, so the user types the
 *   price they pay.
 * - `icon` names a file in public/service-icons, made by build/serviceIcons.ts from Simple Icons
 *   (the brand's own logo; the name is its Simple Icons slug). Without one, a letter tile is shown:
 *   brands Simple Icons doesn't carry, and wordmarks unreadable at tile size. Logos are never loaded
 *   from a third party (it would add a CSP origin and tell them what the user picks).
 * - Which services are listed: the categories US and EU surveys find people pay for most (video,
 *   shopping memberships, music, games, AI, software) and the best-known services in each. There is
 *   no reliable brand-level ranking, so this is a judgement call; add what users type often.
 */
export type CatalogService = {
    name: string;
    category: Category;
    cadence: BillingInterval;
    manageUrl?: string;
    icon?: string;
    /** Other names people type for it. */
    aliases?: string[];
    /**
     * A job where one service usually does (utils/overlaps.ts): paying for two is worth a look. Only
     * for groups where that holds; video and AI assistants have none, since people often use several.
     */
    group?: OverlapGroup;
    /** Catalog services every plan of this bundle includes, so paying for them separately is paying twice. */
    includes?: string[];
};

export type OverlapGroup = 'cloud-storage' | 'music' | 'password-manager';

/** Apple's own subscriptions are all managed from one page. */
const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';
const MICROSOFT_SERVICES = 'https://account.microsoft.com/services';
const GOOGLE_PLAY_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions';

export const SERVICE_CATALOG: CatalogService[] = [
    // Video
    { name: 'Netflix', category: 'Video streaming', cadence: 'monthly', manageUrl: 'https://www.netflix.com/account', icon: 'netflix' },
    { name: 'Amazon Prime', category: 'Shopping & delivery', cadence: 'yearly', aliases: ['prime video'] },
    { name: 'Disney+', category: 'Video streaming', cadence: 'monthly', manageUrl: 'https://www.disneyplus.com/account', aliases: ['disney plus'] },
    { name: 'YouTube Premium', category: 'Video streaming', cadence: 'monthly', manageUrl: 'https://www.youtube.com/paid_memberships', icon: 'youtube', includes: ['YouTube Music'] },
    { name: 'Apple TV+', category: 'Video streaming', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'appletv', aliases: ['apple tv plus'] },
    { name: 'HBO Max', category: 'Video streaming', cadence: 'monthly', icon: 'hbomax', aliases: ['max'] },
    { name: 'Hulu', category: 'Video streaming', cadence: 'monthly' },
    { name: 'Peacock', category: 'Video streaming', cadence: 'monthly' },
    { name: 'Paramount+', category: 'Video streaming', cadence: 'monthly', manageUrl: 'https://www.paramountplus.com/account/', icon: 'paramountplus', aliases: ['paramount plus'] },
    { name: 'YouTube TV', category: 'Video streaming', cadence: 'monthly' },
    { name: 'Sling TV', category: 'Video streaming', cadence: 'monthly', aliases: ['sling'] },
    { name: 'Sky', category: 'Video streaming', cadence: 'monthly', icon: 'sky', aliases: ['sky tv', 'now tv'] },
    { name: 'Canal+', category: 'Video streaming', cadence: 'monthly', aliases: ['canal plus'] },
    { name: 'RTL+', category: 'Video streaming', cadence: 'monthly', aliases: ['rtl plus'] },
    { name: 'SkyShowtime', category: 'Video streaming', cadence: 'monthly' },
    { name: 'Viaplay', category: 'Video streaming', cadence: 'monthly', icon: 'viaplay' },
    { name: 'Movistar Plus+', category: 'Video streaming', cadence: 'monthly', icon: 'movistar', aliases: ['movistar'] },
    { name: 'DAZN', category: 'Video streaming', cadence: 'monthly', icon: 'dazn' },
    { name: 'Crunchyroll', category: 'Video streaming', cadence: 'monthly', manageUrl: 'https://www.crunchyroll.com/account/membership', icon: 'crunchyroll' },
    { name: 'Twitch', category: 'Video streaming', cadence: 'monthly', icon: 'twitch', aliases: ['twitch turbo'] },
    { name: 'Patreon', category: 'Other', cadence: 'monthly', manageUrl: 'https://www.patreon.com/settings/memberships', icon: 'patreon' },

    // Music and audio
    { name: 'Spotify', category: 'Music & audiobooks', cadence: 'monthly', manageUrl: 'https://www.spotify.com/account/overview/', icon: 'spotify', group: 'music' },
    { name: 'Apple Music', category: 'Music & audiobooks', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'applemusic', group: 'music' },
    { name: 'YouTube Music', category: 'Music & audiobooks', cadence: 'monthly', manageUrl: 'https://www.youtube.com/paid_memberships', icon: 'youtubemusic', group: 'music' },
    { name: 'Deezer', category: 'Music & audiobooks', cadence: 'monthly', icon: 'deezer', group: 'music' },
    { name: 'Tidal', category: 'Music & audiobooks', cadence: 'monthly', manageUrl: 'https://account.tidal.com/', icon: 'tidal', group: 'music' },
    { name: 'Pandora', category: 'Music & audiobooks', cadence: 'monthly', icon: 'pandora', group: 'music' },
    { name: 'SiriusXM', category: 'Music & audiobooks', cadence: 'monthly', aliases: ['sirius'] },
    { name: 'Audible', category: 'Music & audiobooks', cadence: 'monthly', icon: 'audible' },
    { name: 'Storytel', category: 'Music & audiobooks', cadence: 'monthly' },
    { name: 'Kindle Unlimited', category: 'News & reading', cadence: 'monthly' },
    { name: 'Apple One', category: 'Other', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'apple', includes: ['Apple Music', 'Apple TV+', 'Apple Arcade', 'iCloud+'] },

    // Games
    { name: 'Xbox Game Pass', category: 'Gaming', cadence: 'monthly', manageUrl: MICROSOFT_SERVICES, aliases: ['game pass'] },
    { name: 'PlayStation Plus', category: 'Gaming', cadence: 'yearly', icon: 'playstation', aliases: ['ps plus'] },
    { name: 'Nintendo Switch Online', category: 'Gaming', cadence: 'yearly' },
    { name: 'Apple Arcade', category: 'Gaming', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'applearcade' },
    { name: 'EA Play', category: 'Gaming', cadence: 'monthly' },
    { name: 'Ubisoft+', category: 'Gaming', cadence: 'monthly', icon: 'ubisoft', aliases: ['ubisoft plus'] },

    // Shopping and delivery memberships
    { name: 'Walmart+', category: 'Shopping & delivery', cadence: 'yearly', aliases: ['walmart plus'] },
    { name: 'Costco membership', category: 'Shopping & delivery', cadence: 'yearly', aliases: ['costco'] },
    { name: 'Uber One', category: 'Shopping & delivery', cadence: 'monthly', icon: 'uber', aliases: ['uber eats'] },
    { name: 'DoorDash DashPass', category: 'Shopping & delivery', cadence: 'monthly', icon: 'doordash', aliases: ['dashpass', 'doordash'] },
    { name: 'Instacart+', category: 'Shopping & delivery', cadence: 'yearly', icon: 'instacart', aliases: ['instacart'] },
    { name: 'Deliveroo Plus', category: 'Shopping & delivery', cadence: 'monthly', icon: 'deliveroo', aliases: ['deliveroo'] },
    { name: 'Wolt+', category: 'Shopping & delivery', cadence: 'monthly', aliases: ['wolt'] },

    // News and reading
    { name: 'The New York Times', category: 'News & reading', cadence: 'monthly', icon: 'newyorktimes', aliases: ['nyt'] },
    { name: 'The Washington Post', category: 'News & reading', cadence: 'monthly', aliases: ['washington post'] },
    { name: 'The Wall Street Journal', category: 'News & reading', cadence: 'monthly', aliases: ['wsj'] },
    { name: 'The Guardian', category: 'News & reading', cadence: 'monthly', aliases: ['guardian'] },
    { name: 'The Economist', category: 'News & reading', cadence: 'yearly' },
    { name: 'Der Spiegel', category: 'News & reading', cadence: 'monthly', aliases: ['spiegel+', 'spiegel'] },
    { name: 'Le Monde', category: 'News & reading', cadence: 'monthly' },
    { name: 'Medium', category: 'News & reading', cadence: 'monthly', manageUrl: 'https://medium.com/me/settings/membership', icon: 'medium' },
    { name: 'Substack', category: 'News & reading', cadence: 'monthly', icon: 'substack' },

    // Social and dating
    { name: 'X Premium', category: 'Social & dating', cadence: 'monthly', icon: 'x', aliases: ['twitter blue'] },
    { name: 'LinkedIn Premium', category: 'Social & dating', cadence: 'monthly', aliases: ['linkedin'] },
    { name: 'Discord Nitro', category: 'Social & dating', cadence: 'monthly', icon: 'discord', aliases: ['nitro', 'discord'] },
    { name: 'Telegram Premium', category: 'Social & dating', cadence: 'monthly', icon: 'telegram', aliases: ['telegram'] },
    { name: 'Snapchat+', category: 'Social & dating', cadence: 'monthly', icon: 'snapchat', aliases: ['snapchat plus', 'snapchat'] },
    { name: 'Tinder', category: 'Social & dating', cadence: 'monthly', icon: 'tinder' },
    { name: 'Bumble', category: 'Social & dating', cadence: 'monthly' },
    { name: 'Hinge', category: 'Social & dating', cadence: 'monthly' },

    // AI assistants
    { name: 'ChatGPT Plus', category: 'AI tools', cadence: 'monthly', manageUrl: 'https://chatgpt.com/', aliases: ['openai', 'chatgpt'] },
    { name: 'Claude Pro', category: 'AI tools', cadence: 'monthly', manageUrl: 'https://claude.ai/settings/billing', icon: 'claude', aliases: ['anthropic', 'claude'] },
    // Google's AI plans are Google One plans, so they include its storage.
    { name: 'Google AI Pro', category: 'AI tools', cadence: 'monthly', manageUrl: 'https://one.google.com/', icon: 'googlegemini', aliases: ['gemini advanced', 'google one ai premium'], includes: ['Google One'] },
    { name: 'Perplexity Pro', category: 'AI tools', cadence: 'monthly', icon: 'perplexity', aliases: ['perplexity'] },
    { name: 'Midjourney', category: 'AI tools', cadence: 'monthly', manageUrl: 'https://www.midjourney.com/account' },

    // Software
    { name: 'Microsoft 365', category: 'Office & productivity', cadence: 'yearly', manageUrl: MICROSOFT_SERVICES, aliases: ['office 365'] },
    { name: 'Google Workspace', category: 'Office & productivity', cadence: 'monthly', manageUrl: 'https://admin.google.com/', icon: 'google', aliases: ['g suite', 'gmail'] },
    { name: 'Adobe Creative Cloud', category: 'Design & creative', cadence: 'monthly', manageUrl: 'https://account.adobe.com/plans', aliases: ['photoshop', 'lightroom'] },
    { name: 'Canva', category: 'Design & creative', cadence: 'yearly', manageUrl: 'https://www.canva.com/settings/billing-and-plans' },
    { name: 'Figma', category: 'Design & creative', cadence: 'monthly', icon: 'figma' },
    { name: 'Notion', category: 'Office & productivity', cadence: 'monthly', icon: 'notion' },
    { name: 'Evernote', category: 'Office & productivity', cadence: 'yearly', icon: 'evernote' },
    { name: 'Todoist', category: 'Office & productivity', cadence: 'yearly', icon: 'todoist' },
    { name: 'Grammarly', category: 'Office & productivity', cadence: 'yearly', manageUrl: 'https://account.grammarly.com/subscription', icon: 'grammarly' },
    { name: 'Zoom', category: 'Office & productivity', cadence: 'monthly', manageUrl: 'https://zoom.us/billing', icon: 'zoom' },
    { name: 'Slack', category: 'Office & productivity', cadence: 'monthly' },
    { name: 'HubSpot', category: 'CRM & sales', cadence: 'monthly', icon: 'hubspot' },
    { name: 'Pipedrive', category: 'CRM & sales', cadence: 'monthly' },
    { name: 'Salesforce', category: 'CRM & sales', cadence: 'yearly' },
    { name: 'GitHub', category: 'Dev & hosting', cadence: 'monthly', manageUrl: 'https://github.com/settings/billing', icon: 'github' },
    { name: 'GitHub Copilot', category: 'AI tools', cadence: 'monthly', manageUrl: 'https://github.com/settings/copilot', icon: 'githubcopilot' },
    { name: 'Cursor', category: 'AI tools', cadence: 'monthly', manageUrl: 'https://cursor.com/settings', icon: 'cursor' },
    { name: 'JetBrains', category: 'Dev & hosting', cadence: 'yearly', manageUrl: 'https://account.jetbrains.com/licenses', icon: 'jetbrains', aliases: ['phpstorm', 'intellij'] },

    // Learning
    { name: 'Duolingo Super', category: 'Learning', cadence: 'yearly', icon: 'duolingo', aliases: ['duolingo'] },
    { name: 'Babbel', category: 'Learning', cadence: 'monthly' },
    { name: 'Coursera Plus', category: 'Learning', cadence: 'yearly', icon: 'coursera', aliases: ['coursera'] },
    { name: 'Skillshare', category: 'Learning', cadence: 'yearly' },
    { name: 'MasterClass', category: 'Learning', cadence: 'yearly' },

    // Security and privacy
    { name: '1Password', category: 'Security & VPN', cadence: 'yearly', manageUrl: 'https://my.1password.com/', icon: '1password', group: 'password-manager' },
    { name: 'Bitwarden', category: 'Security & VPN', cadence: 'yearly', manageUrl: 'https://vault.bitwarden.com/', icon: 'bitwarden', group: 'password-manager' },
    { name: 'NordVPN', category: 'Security & VPN', cadence: 'yearly', manageUrl: 'https://my.nordaccount.com/', icon: 'nordvpn', aliases: ['vpn'] },
    { name: 'ExpressVPN', category: 'Security & VPN', cadence: 'yearly', icon: 'expressvpn' },
    { name: 'Surfshark', category: 'Security & VPN', cadence: 'yearly', icon: 'surfshark' },
    { name: 'Proton', category: 'Security & VPN', cadence: 'yearly', manageUrl: 'https://account.proton.me/', icon: 'proton', aliases: ['proton mail', 'proton vpn'] },
    { name: 'Norton', category: 'Security & VPN', cadence: 'yearly', icon: 'norton', aliases: ['norton 360'] },
    { name: 'McAfee', category: 'Security & VPN', cadence: 'yearly', icon: 'mcafee' },
    { name: 'Bitdefender', category: 'Security & VPN', cadence: 'yearly', icon: 'bitdefender' },

    // Cloud and storage
    { name: 'iCloud+', category: 'Cloud storage', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'icloud', aliases: ['icloud'], group: 'cloud-storage' },
    { name: 'Google One', category: 'Cloud storage', cadence: 'monthly', manageUrl: 'https://one.google.com/', icon: 'google', aliases: ['google drive storage'], group: 'cloud-storage' },
    { name: 'Google Play subscription', category: 'Other', cadence: 'monthly', manageUrl: GOOGLE_PLAY_SUBSCRIPTIONS, icon: 'googleplay' },
    { name: 'Dropbox', category: 'Cloud storage', cadence: 'yearly', manageUrl: 'https://www.dropbox.com/account/plan', icon: 'dropbox', group: 'cloud-storage' },
    { name: 'AWS', category: 'Dev & hosting', cadence: 'monthly', manageUrl: 'https://console.aws.amazon.com/billing/', aliases: ['amazon web services'] },
    { name: 'DigitalOcean', category: 'Dev & hosting', cadence: 'monthly', manageUrl: 'https://cloud.digitalocean.com/account/billing', icon: 'digitalocean' },
    { name: 'Hetzner', category: 'Dev & hosting', cadence: 'monthly', manageUrl: 'https://accounts.hetzner.com/', icon: 'hetzner' },
    { name: 'Cloudflare', category: 'Dev & hosting', cadence: 'monthly', manageUrl: 'https://dash.cloudflare.com/', icon: 'cloudflare' },
    { name: 'Vercel', category: 'Dev & hosting', cadence: 'monthly', manageUrl: 'https://vercel.com/dashboard', icon: 'vercel' },
    { name: 'Domain name', category: 'Dev & hosting', cadence: 'yearly', icon: 'domain', aliases: ['domain'] },

    // Fitness and health
    { name: 'Strava', category: 'Health & fitness', cadence: 'yearly', manageUrl: 'https://www.strava.com/account', icon: 'strava' },
    { name: 'Peloton', category: 'Health & fitness', cadence: 'monthly', icon: 'peloton' },
    { name: 'Fitbit Premium', category: 'Health & fitness', cadence: 'monthly', icon: 'fitbit', aliases: ['fitbit'] },
    { name: 'Apple Fitness+', category: 'Health & fitness', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'apple' },
    { name: 'Urban Sports Club', category: 'Health & fitness', cadence: 'monthly' },
    { name: 'Gym membership', category: 'Health & fitness', cadence: 'monthly', aliases: ['gym'] },
    { name: 'Headspace', category: 'Health & fitness', cadence: 'yearly', icon: 'headspace' },
    { name: 'Calm', category: 'Health & fitness', cadence: 'yearly' },

    // Banking and everyday
    { name: 'Revolut', category: 'Banking & finance', cadence: 'monthly', icon: 'revolut', aliases: ['revolut premium', 'revolut metal'] },
    { name: 'N26', category: 'Banking & finance', cadence: 'monthly', icon: 'n26' },
    { name: 'Bank account fee', category: 'Banking & finance', cadence: 'monthly', aliases: ['bank'] },
    { name: 'Mobile phone plan', category: 'Phone & internet', cadence: 'monthly', aliases: ['phone', 'mobile'] },
    { name: 'Home internet', category: 'Phone & internet', cadence: 'monthly', aliases: ['internet', 'broadband', 'wifi'] },
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

/**
 * The catalog service a subscription is, also when a plan name follows it: "Google One Basic",
 * "Spotify Family", "iCloud+ 200GB". The typed name must start with the whole catalog name (or an
 * alias) and a space, and the longest match wins ("Apple One Premier" is Apple One), so nothing is
 * guessed from a partial word. Used by the overlap check and for a subscription's icon; the add
 * form's suggestions stay exact.
 */
export const catalogServiceOf = (serviceName: string): CatalogService | undefined => {
    const exact = findCatalogService(serviceName);
    if (exact) return exact;
    const typed = serviceName.trim().toLowerCase().replace(/\s+/g, ' ');
    let best: { service: CatalogService; length: number } | undefined;
    SERVICE_CATALOG.forEach((service) => {
        [service.name, ...(service.aliases ?? [])].forEach((name) => {
            const prefix = `${name.toLowerCase()} `;
            if (typed.startsWith(prefix) && prefix.length > (best?.length ?? 0)) best = { service, length: prefix.length };
        });
    });
    return best?.service;
};

/** The picture for a catalog entry: its own icon file, or null for a letter tile. */
export const catalogIconSrc = (service: CatalogService): string | null =>
    service.icon ? `/service-icons/${service.icon}.svg` : null;
