import React from 'react';
import { Box, Container, IconButton, Tooltip, useTheme } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useAppTheme } from '../context/ThemeContext';

type AppShellProps = {
    children: React.ReactNode;
    centered?: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
    showThemeToggle?: boolean;
};

const AppShell: React.FC<AppShellProps> = ({
                                               children,
                                               centered = true,
                                               maxWidth = 'sm',
                                               showThemeToggle = true,
                                           }) => {
    const theme = useTheme();
    const { mode, toggleColorMode } = useAppTheme();

    const background =
        theme.palette.mode === 'dark'
            ? `
                radial-gradient(circle at top left, rgba(46, 204, 113, 0.18), transparent 30%),
                radial-gradient(circle at top right, rgba(21, 101, 192, 0.10), transparent 24%),
                linear-gradient(180deg, #0f1724 0%, #121a2a 44%, #101c19 100%)
              `
            : `
                radial-gradient(circle at top left, rgba(46, 204, 113, 0.16), transparent 30%),
                radial-gradient(circle at top right, rgba(21, 101, 192, 0.08), transparent 24%),
                linear-gradient(180deg, #f4fbf7 0%, #f2fbf8 44%, #eef8ff 100%)
              `;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundImage: background,
                backgroundAttachment: 'fixed',
                display: 'flex',
                flexDirection: 'column',
                px: 2,
                py: centered ? 3 : 0,
            }}
        >
            {showThemeToggle && centered && (
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        mb: 2,
                    }}
                >
                    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                        <IconButton
                            onClick={toggleColorMode}
                            sx={{
                                color: 'text.primary',
                                bgcolor:
                                    theme.palette.mode === 'dark'
                                        ? 'rgba(18, 24, 38, 0.68)'
                                        : 'rgba(255, 255, 255, 0.72)',
                                border: `1px solid ${theme.palette.divider}`,
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                    bgcolor:
                                        theme.palette.mode === 'dark'
                                            ? 'rgba(18, 24, 38, 0.82)'
                                            : 'rgba(255, 255, 255, 0.9)',
                                },
                            }}
                        >
                            {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: centered ? 'center' : 'stretch',
                    justifyContent: 'center',
                }}
            >
                <Container
                    maxWidth={maxWidth}
                    sx={{
                        width: '100%',
                        py: centered ? 0 : { xs: 4, md: 6 },
                    }}
                >
                    {children}
                </Container>
            </Box>
        </Box>
    );
};

export default AppShell;
