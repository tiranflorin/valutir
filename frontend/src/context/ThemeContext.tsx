import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { PaletteMode } from '@mui/material';
import { createAppTheme } from '../theme/theme';

interface ThemeModeContextType {
    mode: PaletteMode;
    toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextType>({
    mode: 'light',
    toggleMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<PaletteMode>('light');

    const toggleMode = () => setMode(prev => (prev === 'light' ? 'dark' : 'light'));

    const theme = useMemo(() => createAppTheme(mode), [mode]);

    return (
        <ThemeModeContext.Provider value={{ mode, toggleMode }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
};
