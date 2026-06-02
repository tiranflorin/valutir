import { createTheme, PaletteMode } from '@mui/material';

export const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        primary: {
            main: '#1565C0',      // React blue
            light: '#1E88E5',
            dark: '#0D47A1',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#2ECC71',      // light green
            light: '#52D68A',
            dark: '#27AE60',
            contrastText: '#ffffff',
        },
        background: {
            default: mode === 'dark' ? '#0A0E1A' : '#F0F4FF',
            paper: mode === 'dark' ? '#111827' : '#ffffff',
        },
        text: {
            primary: mode === 'dark' ? '#E8EAF6' : '#0D1B2A',
            secondary: mode === 'dark' ? '#90A4AE' : '#546E7A',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        button: { textTransform: 'none' as const, fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 10, paddingTop: 10, paddingBottom: 10 },
            },
        },
        MuiTextField: {
            defaultProps: { variant: 'outlined' as const },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});

export const createAppTheme = (mode: PaletteMode) =>
    createTheme(getDesignTokens(mode));
