import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppThemeProvider } from '../context/ThemeContext';
import ThemeModeToggle from '../components/ThemeModeToggle';
import { THEME_MODE_KEY, THEME_MODE_TTL_MS, readThemeMode } from '../utils/themeMode';

const openApp = () =>
    render(
        <AppThemeProvider>
            <ThemeModeToggle />
        </AppThemeProvider>
    );

describe('theme mode', () => {
    afterEach(() => {
        window.localStorage.clear();
        vi.restoreAllMocks();
    });

    it('opens light by default and stores nothing', () => {
        openApp();

        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
        expect(window.localStorage.getItem(THEME_MODE_KEY)).toBeNull();
    });

    it('stays dark after a reload until the user switches back to light', async () => {
        const user = userEvent.setup();
        const first = openApp();
        await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
        first.unmount();

        const reloaded = openApp();
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

        await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
        expect(window.localStorage.getItem(THEME_MODE_KEY)).toBeNull();
        reloaded.unmount();

        openApp();
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });

    it('opens light again 12 hours after the last visit, and each visit renews the 12 hours', () => {
        const chosenAt = Date.UTC(2026, 10, 15, 8);
        window.localStorage.setItem(THEME_MODE_KEY, String(chosenAt + THEME_MODE_TTL_MS));

        const elevenHoursLater = chosenAt + 11 * 60 * 60 * 1000;
        expect(readThemeMode(elevenHoursLater)).toBe('dark');
        // The visit 11 hours in moved the expiry to 12 hours after it, so 20 hours in is still dark.
        expect(readThemeMode(chosenAt + 20 * 60 * 60 * 1000)).toBe('dark');

        expect(readThemeMode(chosenAt + 33 * 60 * 60 * 1000)).toBe('light');
        expect(window.localStorage.getItem(THEME_MODE_KEY)).toBeNull();
    });

    it('opens light when browser storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(readThemeMode()).toBe('light');
    });
});
