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
    category: 'Entertainment' | 'Software' | 'Fitness' | 'Banking' | 'Utilities' | 'Cloud' | 'Other';
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
    { name: 'Netflix', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.netflix.com/account', icon: 'netflix' },
    { name: 'Amazon Prime', category: 'Entertainment', cadence: 'yearly', aliases: ['prime video'] },
    { name: 'Disney+', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.disneyplus.com/account', aliases: ['disney plus'] },
    { name: 'YouTube Premium', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.youtube.com/paid_memberships', icon: 'youtube', includes: ['YouTube Music'] },
    { name: 'Apple TV+', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'appletv', aliases: ['apple tv plus'] },
    { name: 'HBO Max', category: 'Entertainment', cadence: 'monthly', icon: 'hbomax', aliases: ['max'] },
    { name: 'Hulu', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Peacock', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Paramount+', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.paramountplus.com/account/', icon: 'paramountplus', aliases: ['paramount plus'] },
    { name: 'YouTube TV', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Sling TV', category: 'Entertainment', cadence: 'monthly', aliases: ['sling'] },
    { name: 'Sky', category: 'Entertainment', cadence: 'monthly', icon: 'sky', aliases: ['sky tv', 'now tv'] },
    { name: 'Canal+', category: 'Entertainment', cadence: 'monthly', aliases: ['canal plus'] },
    { name: 'RTL+', category: 'Entertainment', cadence: 'monthly', aliases: ['rtl plus'] },
    { name: 'SkyShowtime', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Viaplay', category: 'Entertainment', cadence: 'monthly', icon: 'viaplay' },
    { name: 'Movistar Plus+', category: 'Entertainment', cadence: 'monthly', icon: 'movistar', aliases: ['movistar'] },
    { name: 'DAZN', category: 'Entertainment', cadence: 'monthly', icon: 'dazn' },
    { name: 'Crunchyroll', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.crunchyroll.com/account/membership', icon: 'crunchyroll' },
    { name: 'Twitch', category: 'Entertainment', cadence: 'monthly', icon: 'twitch', aliases: ['twitch turbo'] },
    { name: 'Patreon', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.patreon.com/settings/memberships', icon: 'patreon' },

    // Music and audio
    { name: 'Spotify', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.spotify.com/account/overview/', icon: 'spotify', group: 'music' },
    { name: 'Apple Music', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'applemusic', group: 'music' },
    { name: 'YouTube Music', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://www.youtube.com/paid_memberships', icon: 'youtubemusic', group: 'music' },
    { name: 'Deezer', category: 'Entertainment', cadence: 'monthly', icon: 'deezer', group: 'music' },
    { name: 'Tidal', category: 'Entertainment', cadence: 'monthly', manageUrl: 'https://account.tidal.com/', icon: 'tidal', group: 'music' },
    { name: 'Pandora', category: 'Entertainment', cadence: 'monthly', icon: 'pandora', group: 'music' },
    { name: 'SiriusXM', category: 'Entertainment', cadence: 'monthly', aliases: ['sirius'] },
    { name: 'Audible', category: 'Entertainment', cadence: 'monthly', icon: 'audible' },
    { name: 'Storytel', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Kindle Unlimited', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Apple One', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'apple', includes: ['Apple Music', 'Apple TV+', 'Apple Arcade', 'iCloud+'] },

    // Games
    { name: 'Xbox Game Pass', category: 'Entertainment', cadence: 'monthly', manageUrl: MICROSOFT_SERVICES, aliases: ['game pass'] },
    { name: 'PlayStation Plus', category: 'Entertainment', cadence: 'yearly', icon: 'playstation', aliases: ['ps plus'] },
    { name: 'Nintendo Switch Online', category: 'Entertainment', cadence: 'yearly' },
    { name: 'Apple Arcade', category: 'Entertainment', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'applearcade' },
    { name: 'EA Play', category: 'Entertainment', cadence: 'monthly' },
    { name: 'Ubisoft+', category: 'Entertainment', cadence: 'monthly', icon: 'ubisoft', aliases: ['ubisoft plus'] },

    // Shopping and delivery memberships
    { name: 'Walmart+', category: 'Other', cadence: 'yearly', aliases: ['walmart plus'] },
    { name: 'Costco membership', category: 'Other', cadence: 'yearly', aliases: ['costco'] },
    { name: 'Uber One', category: 'Other', cadence: 'monthly', icon: 'uber', aliases: ['uber eats'] },
    { name: 'DoorDash DashPass', category: 'Other', cadence: 'monthly', icon: 'doordash', aliases: ['dashpass', 'doordash'] },
    { name: 'Instacart+', category: 'Other', cadence: 'yearly', icon: 'instacart', aliases: ['instacart'] },
    { name: 'Deliveroo Plus', category: 'Other', cadence: 'monthly', icon: 'deliveroo', aliases: ['deliveroo'] },
    { name: 'Wolt+', category: 'Other', cadence: 'monthly', aliases: ['wolt'] },

    // News and reading
    { name: 'The New York Times', category: 'Other', cadence: 'monthly', icon: 'newyorktimes', aliases: ['nyt'] },
    { name: 'The Washington Post', category: 'Other', cadence: 'monthly', aliases: ['washington post'] },
    { name: 'The Wall Street Journal', category: 'Other', cadence: 'monthly', aliases: ['wsj'] },
    { name: 'The Guardian', category: 'Other', cadence: 'monthly', aliases: ['guardian'] },
    { name: 'The Economist', category: 'Other', cadence: 'yearly' },
    { name: 'Der Spiegel', category: 'Other', cadence: 'monthly', aliases: ['spiegel+', 'spiegel'] },
    { name: 'Le Monde', category: 'Other', cadence: 'monthly' },
    { name: 'Medium', category: 'Other', cadence: 'monthly', manageUrl: 'https://medium.com/me/settings/membership', icon: 'medium' },
    { name: 'Substack', category: 'Other', cadence: 'monthly', icon: 'substack' },

    // Social and dating
    { name: 'X Premium', category: 'Other', cadence: 'monthly', icon: 'x', aliases: ['twitter blue'] },
    { name: 'LinkedIn Premium', category: 'Other', cadence: 'monthly', aliases: ['linkedin'] },
    { name: 'Discord Nitro', category: 'Other', cadence: 'monthly', icon: 'discord', aliases: ['nitro', 'discord'] },
    { name: 'Telegram Premium', category: 'Other', cadence: 'monthly', icon: 'telegram', aliases: ['telegram'] },
    { name: 'Snapchat+', category: 'Other', cadence: 'monthly', icon: 'snapchat', aliases: ['snapchat plus', 'snapchat'] },
    { name: 'Tinder', category: 'Other', cadence: 'monthly', icon: 'tinder' },
    { name: 'Bumble', category: 'Other', cadence: 'monthly' },
    { name: 'Hinge', category: 'Other', cadence: 'monthly' },

    // AI assistants
    { name: 'ChatGPT Plus', category: 'Software', cadence: 'monthly', manageUrl: 'https://chatgpt.com/', aliases: ['openai', 'chatgpt'] },
    { name: 'Claude Pro', category: 'Software', cadence: 'monthly', manageUrl: 'https://claude.ai/settings/billing', icon: 'claude', aliases: ['anthropic', 'claude'] },
    // Google's AI plans are Google One plans, so they include its storage.
    { name: 'Google AI Pro', category: 'Software', cadence: 'monthly', manageUrl: 'https://one.google.com/', icon: 'googlegemini', aliases: ['gemini advanced', 'google one ai premium'], includes: ['Google One'] },
    { name: 'Perplexity Pro', category: 'Software', cadence: 'monthly', icon: 'perplexity', aliases: ['perplexity'] },
    { name: 'Midjourney', category: 'Software', cadence: 'monthly', manageUrl: 'https://www.midjourney.com/account' },

    // Software
    { name: 'Microsoft 365', category: 'Software', cadence: 'yearly', manageUrl: MICROSOFT_SERVICES, aliases: ['office 365'] },
    { name: 'Google Workspace', category: 'Software', cadence: 'monthly', manageUrl: 'https://admin.google.com/', icon: 'google', aliases: ['g suite', 'gmail'] },
    { name: 'Adobe Creative Cloud', category: 'Software', cadence: 'monthly', manageUrl: 'https://account.adobe.com/plans', aliases: ['photoshop', 'lightroom'] },
    { name: 'Canva', category: 'Software', cadence: 'yearly', manageUrl: 'https://www.canva.com/settings/billing-and-plans' },
    { name: 'Figma', category: 'Software', cadence: 'monthly', icon: 'figma' },
    { name: 'Notion', category: 'Software', cadence: 'monthly', icon: 'notion' },
    { name: 'Evernote', category: 'Software', cadence: 'yearly', icon: 'evernote' },
    { name: 'Todoist', category: 'Software', cadence: 'yearly', icon: 'todoist' },
    { name: 'Grammarly', category: 'Software', cadence: 'yearly', manageUrl: 'https://account.grammarly.com/subscription', icon: 'grammarly' },
    { name: 'Zoom', category: 'Software', cadence: 'monthly', manageUrl: 'https://zoom.us/billing', icon: 'zoom' },
    { name: 'Slack', category: 'Software', cadence: 'monthly' },
    { name: 'GitHub', category: 'Software', cadence: 'monthly', manageUrl: 'https://github.com/settings/billing', icon: 'github' },
    { name: 'GitHub Copilot', category: 'Software', cadence: 'monthly', manageUrl: 'https://github.com/settings/copilot', icon: 'githubcopilot' },
    { name: 'Cursor', category: 'Software', cadence: 'monthly', manageUrl: 'https://cursor.com/settings', icon: 'cursor' },
    { name: 'JetBrains', category: 'Software', cadence: 'yearly', manageUrl: 'https://account.jetbrains.com/licenses', icon: 'jetbrains', aliases: ['phpstorm', 'intellij'] },

    // Learning
    { name: 'Duolingo Super', category: 'Software', cadence: 'yearly', icon: 'duolingo', aliases: ['duolingo'] },
    { name: 'Babbel', category: 'Software', cadence: 'monthly' },
    { name: 'Coursera Plus', category: 'Software', cadence: 'yearly', icon: 'coursera', aliases: ['coursera'] },
    { name: 'Skillshare', category: 'Software', cadence: 'yearly' },
    { name: 'MasterClass', category: 'Software', cadence: 'yearly' },

    // Security and privacy
    { name: '1Password', category: 'Software', cadence: 'yearly', manageUrl: 'https://my.1password.com/', icon: '1password', group: 'password-manager' },
    { name: 'Bitwarden', category: 'Software', cadence: 'yearly', manageUrl: 'https://vault.bitwarden.com/', icon: 'bitwarden', group: 'password-manager' },
    { name: 'NordVPN', category: 'Software', cadence: 'yearly', manageUrl: 'https://my.nordaccount.com/', icon: 'nordvpn', aliases: ['vpn'] },
    { name: 'ExpressVPN', category: 'Software', cadence: 'yearly', icon: 'expressvpn' },
    { name: 'Surfshark', category: 'Software', cadence: 'yearly', icon: 'surfshark' },
    { name: 'Proton', category: 'Software', cadence: 'yearly', manageUrl: 'https://account.proton.me/', icon: 'proton', aliases: ['proton mail', 'proton vpn'] },
    { name: 'Norton', category: 'Software', cadence: 'yearly', icon: 'norton', aliases: ['norton 360'] },
    { name: 'McAfee', category: 'Software', cadence: 'yearly', icon: 'mcafee' },
    { name: 'Bitdefender', category: 'Software', cadence: 'yearly', icon: 'bitdefender' },

    // Cloud and storage
    { name: 'iCloud+', category: 'Cloud', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'icloud', aliases: ['icloud'], group: 'cloud-storage' },
    { name: 'Google One', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://one.google.com/', icon: 'google', aliases: ['google drive storage'], group: 'cloud-storage' },
    { name: 'Google Play subscription', category: 'Other', cadence: 'monthly', manageUrl: GOOGLE_PLAY_SUBSCRIPTIONS, icon: 'googleplay' },
    { name: 'Dropbox', category: 'Cloud', cadence: 'yearly', manageUrl: 'https://www.dropbox.com/account/plan', icon: 'dropbox', group: 'cloud-storage' },
    { name: 'AWS', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://console.aws.amazon.com/billing/', aliases: ['amazon web services'] },
    { name: 'DigitalOcean', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://cloud.digitalocean.com/account/billing', icon: 'digitalocean' },
    { name: 'Hetzner', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://accounts.hetzner.com/', icon: 'hetzner' },
    { name: 'Cloudflare', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://dash.cloudflare.com/', icon: 'cloudflare' },
    { name: 'Vercel', category: 'Cloud', cadence: 'monthly', manageUrl: 'https://vercel.com/dashboard', icon: 'vercel' },
    { name: 'Domain name', category: 'Cloud', cadence: 'yearly', icon: 'domain', aliases: ['domain'] },

    // Fitness and health
    { name: 'Strava', category: 'Fitness', cadence: 'yearly', manageUrl: 'https://www.strava.com/account', icon: 'strava' },
    { name: 'Peloton', category: 'Fitness', cadence: 'monthly', icon: 'peloton' },
    { name: 'Fitbit Premium', category: 'Fitness', cadence: 'monthly', icon: 'fitbit', aliases: ['fitbit'] },
    { name: 'Apple Fitness+', category: 'Fitness', cadence: 'monthly', manageUrl: APPLE_SUBSCRIPTIONS, icon: 'apple' },
    { name: 'Urban Sports Club', category: 'Fitness', cadence: 'monthly' },
    { name: 'Gym membership', category: 'Fitness', cadence: 'monthly', aliases: ['gym'] },
    { name: 'Headspace', category: 'Fitness', cadence: 'yearly', icon: 'headspace' },
    { name: 'Calm', category: 'Fitness', cadence: 'yearly' },

    // Banking and everyday
    { name: 'Revolut', category: 'Banking', cadence: 'monthly', icon: 'revolut', aliases: ['revolut premium', 'revolut metal'] },
    { name: 'N26', category: 'Banking', cadence: 'monthly', icon: 'n26' },
    { name: 'Bank account fee', category: 'Banking', cadence: 'monthly', aliases: ['bank'] },
    { name: 'Mobile phone plan', category: 'Utilities', cadence: 'monthly', aliases: ['phone', 'mobile'] },
    { name: 'Home internet', category: 'Utilities', cadence: 'monthly', aliases: ['internet', 'broadband', 'wifi'] },
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
