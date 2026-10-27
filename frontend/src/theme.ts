import { createTheme, type PaletteMode } from '@mui/material';

export const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        primary: {
            main: '#176B43',
            light: '#258653',
            dark: '#105A37',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#1677FF',
            light: '#22D3EE',
            dark: '#0753D8',
            contrastText: '#ffffff',
        },
        background: {
            default: mode === 'dark' ? '#0F172A' : '#F2F6F3',
            paper: mode === 'dark' ? '#172033' : '#ffffff',
        },
        text: {
            primary: mode === 'dark' ? '#F1F5F9' : '#17241D',
            secondary: mode === 'dark' ? '#A8B4C8' : '#69776E',
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
