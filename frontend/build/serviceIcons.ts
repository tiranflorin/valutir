/**
 * Writes service icons for the catalog (src/data/services.ts) into public/service-icons, from Simple
 * Icons (https://simpleicons.org, CC0): each brand's own glyph, in white or near-black on a rounded tile
 * in the brand's colour. Run by hand when adding a service, not during the build:
 *
 *   node build/serviceIcons.ts netflix spotify
 *
 * Arguments are Simple Icons slugs; the file is named after the slug, which is what a catalog entry's
 * `icon` holds. A brand Simple Icons doesn't carry (some asked to be removed) gets no icon: the app
 * shows a letter tile. Don't draw or copy a logo from anywhere else. Check the result at 26 px: a
 * wide wordmark (Der Spiegel, The Guardian) is unreadable that small, so leave those without an icon too.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Pinned so a regenerated icon only changes when this does. */
const SIMPLE_ICONS_VERSION = '16.36.0';
const BASE = `https://cdn.jsdelivr.net/npm/simple-icons@${SIMPLE_ICONS_VERSION}`;
const OUT = resolve(import.meta.dirname, '../public/service-icons');

type IconData = { title: string; slug: string; hex: string };

/** WCAG relative luminance of a 6-digit hex colour. */
const luminance = (hex: string): number => {
    const [r, g, b] = [0, 2, 4].map((i) => {
        const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** White on the brand colour, unless that is too faint (yellow, light grey): then near-black. */
const glyphColour = (hex: string): string => ((1.05) / (luminance(hex) + 0.05) >= 2.5 ? '#FFFFFF' : '#16181D');

const tile = (path: string, hex: string, title: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>${title}</title>`
    + `<rect width="48" height="48" rx="13" fill="#${hex}"/>`
    // The 24-unit glyph drawn 28 wide, centred: big enough for thin logos, with room around it.
    + `<g transform="translate(10 10) scale(1.1667)"><path fill="${glyphColour(hex)}" d="${path}"/></g></svg>\n`;

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
    console.error('Usage: node build/serviceIcons.ts <simple-icons slug>...');
    process.exit(1);
}

const index = await (await fetch(`${BASE}/data/simple-icons.json`)).json() as IconData[];
for (const slug of slugs) {
    const data = index.find((icon) => icon.slug === slug);
    if (!data) {
        console.error(`${slug}: not in Simple Icons ${SIMPLE_ICONS_VERSION}; leave the entry without an icon.`);
        process.exitCode = 1;
        continue;
    }
    const svg = await (await fetch(`${BASE}/icons/${slug}.svg`)).text();
    const path = svg.match(/<path d="([^"]+)"/)?.[1];
    if (!path) {
        console.error(`${slug}: no path in the downloaded SVG.`);
        process.exitCode = 1;
        continue;
    }
    writeFileSync(`${OUT}/${slug}.svg`, tile(path, data.hex, data.title.replace(/[<&>"]/g, '')));
    console.log(`${slug}: ${data.title} #${data.hex}`);
}
