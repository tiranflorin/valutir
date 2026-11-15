import { describe, expect, it } from 'vitest';
import { SERVICE_CATALOG, catalogServiceOf } from '../data/services';

/** The icon files in public/service-icons, by name. */
const ICON_FILES = Object.keys(import.meta.glob('/public/service-icons/*.svg')).map((path) => path.replace(/^.*\/(.+)\.svg$/, '$1'));

describe('the service catalog', () => {
    it('has a file for every icon, and no icon file nothing uses', () => {
        const files = [...ICON_FILES].sort();
        const icons = [...new Set(SERVICE_CATALOG.flatMap((service) => (service.icon ? [service.icon] : [])))].sort();
        expect(icons).toEqual(files);
    });

    it('gives each name and alias to one service only, so a name never shows another service’s icon', () => {
        const names = SERVICE_CATALOG.flatMap((service) => [service.name, ...(service.aliases ?? [])].map((name) => name.toLowerCase()));
        expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
    });

    it('matches a plan name to its service, but never a different word that starts the same', () => {
        expect(catalogServiceOf('Discord Nitro Basic')?.name).toBe('Discord Nitro');
        expect(catalogServiceOf('Uber Eats')?.name).toBe('Uber One');
        expect(catalogServiceOf('Gemini exchange')).toBeUndefined();
        expect(catalogServiceOf('X Factor tickets')).toBeUndefined();
        expect(catalogServiceOf('WoW')).toBeUndefined();
    });
});
