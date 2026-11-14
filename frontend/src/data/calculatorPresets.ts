/**
 * The calculator's landing pages: the same calculator, with its own heading, introduction and the
 * services that group is most likely to pay for listed first. Each path is also in src/seo/pages.ts.
 */
export type CalculatorPreset = {
    path: string;
    /** Link text from the other calculators. */
    label: string;
    eyebrow: string;
    heading: string;
    intro: string;
    /** Catalog names listed first, in this order. */
    suggested: string[];
};

export const CALCULATOR_PRESETS: Record<'all' | 'streaming' | 'ai-tools' | 'software', CalculatorPreset> = {
    all: {
        path: '/calculator',
        label: 'All subscriptions',
        eyebrow: 'Free subscription calculator',
        heading: 'What do your subscriptions cost a year?',
        intro: 'Tick what you pay for and type each price. You’ll see the monthly, yearly and five-year cost, and what dropping a few would free up. No sign-up, and nothing you type leaves your browser.',
        suggested: ['Netflix', 'Spotify', 'YouTube Premium', 'Amazon Prime', 'Disney+', 'iCloud+', 'Google One', 'ChatGPT Plus', 'Microsoft 365', 'Gym membership', 'Mobile phone plan', 'Xbox Game Pass'],
    },
    streaming: {
        path: '/streaming-cost-calculator',
        label: 'Streaming',
        eyebrow: 'Streaming cost calculator',
        heading: 'What does your streaming cost a year?',
        intro: 'Video, music, games and audiobooks add up one small charge at a time. Tick the services you pay for and see the total for a month, a year and five years.',
        suggested: ['Netflix', 'Disney+', 'Amazon Prime', 'HBO Max', 'Apple TV+', 'Paramount+', 'YouTube Premium', 'DAZN', 'Crunchyroll', 'Spotify', 'Apple Music', 'YouTube Music', 'Deezer', 'Tidal', 'Audible', 'Xbox Game Pass', 'PlayStation Plus'],
    },
    'ai-tools': {
        path: '/ai-tools-cost-calculator',
        label: 'AI tools',
        eyebrow: 'AI tools cost calculator',
        heading: 'What does your AI stack cost a year?',
        intro: 'Chat assistants, coding assistants and image tools each look cheap on their own. Add the ones you pay for and see what your AI stack costs together.',
        suggested: ['ChatGPT Plus', 'Claude Pro', 'GitHub Copilot', 'Cursor', 'Midjourney', 'Grammarly', 'Notion', 'Canva', 'Adobe Creative Cloud'],
    },
    software: {
        path: '/software-cost-calculator',
        label: 'Software and cloud',
        eyebrow: 'Software and cloud cost calculator',
        heading: 'What do your software and cloud tools cost a year?',
        intro: 'For freelancers, developers and small teams: office suites, design tools, password managers, hosting and domains. See your monthly and yearly software bill in one place.',
        suggested: ['Microsoft 365', 'Google Workspace', 'Adobe Creative Cloud', 'Figma', 'Notion', 'Slack', 'Zoom', 'GitHub', 'JetBrains', '1Password', 'Bitwarden', 'Dropbox', 'AWS', 'DigitalOcean', 'Hetzner', 'Vercel', 'Cloudflare', 'Domain name'],
    },
};
