import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from 'react';
import { CssBaseline, ThemeProvider, type PaletteMode } from '@mui/material';
import { createAppTheme } from '../theme';
import { readThemeMode, saveThemeMode } from '../utils/themeMode';

// Sets the page's data-theme before the first paint, so a reload in dark mode doesn't flash light.
// The server render (prerendering) has no layout effects, so it uses useEffect there to avoid React's warning.
const useBeforePaintEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type ThemeContextValue = {
    mode: PaletteMode;
    toggleColorMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                              children,
                                                                          }) => {
    const [mode, setMode] = useState<PaletteMode>(() => readThemeMode());

    useBeforePaintEffect(() => {
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const toggleColorMode = useCallback(() => {
        const next: PaletteMode = mode === 'light' ? 'dark' : 'light';
        saveThemeMode(next);
        setMode(next);
    }, [mode]);

    const theme = useMemo(() => createAppTheme(mode), [mode]);

    const value = useMemo(
        () => ({
            mode,
            toggleColorMode,
        }),
        [mode, toggleColorMode]
    );

    return (
        <ThemeContext.Provider value={value}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useAppTheme must be used within AppThemeProvider');
    }

    return context;
};
