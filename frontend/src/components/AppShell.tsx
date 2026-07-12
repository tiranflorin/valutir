import React from 'react';
import { Box, Container, IconButton, Tooltip, useTheme } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useAppTheme } from '../context/ThemeContext';

type AppShellProps = {
    children: React.ReactNode;
    mode?: 'auth' | 'content';
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
    showThemeToggle?: boolean;
};

const AppShell: React.FC<AppShellProps> = ({
                                               children,
                                               mode = 'content',
                                               maxWidth = 'sm',
                                               showThemeToggle = false,
                                           }) => {
    const theme = useTheme();
    const { mode: colorMode, toggleColorMode } = useAppTheme();

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

    const isAuth = mode === 'auth';

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background,
                backgroundAttachment: 'fixed',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isAuth ? 'center' : 'flex-start',
            }}
        >
            {showThemeToggle && (
                <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 20 }}>
                    <Tooltip title={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                        <IconButton onClick={toggleColorMode} color="inherit" aria-label="Toggle theme">
                            {colorMode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            <Container
                maxWidth={maxWidth}
                sx={{
                    flex: isAuth ? '0 0 auto' : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: isAuth ? 'center' : 'flex-start',
                    py: isAuth ? 4 : 0,
                }}
            >
                {children}
            </Container>
        </Box>
    );
};

export default AppShell;
