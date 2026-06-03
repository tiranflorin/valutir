import React from 'react';
import { Box, Container, useTheme } from '@mui/material';

type AppShellProps = {
    children: React.ReactNode;
    centered?: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
};

const AppShell: React.FC<AppShellProps> = ({
                                               children,
                                               centered = true,
                                               maxWidth = 'sm',
                                           }) => {
    const theme = useTheme();

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
                alignItems: centered ? 'center' : 'stretch',
                justifyContent: 'center',
                px: 2,
                py: centered ? 4 : 0,
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
    );
};

export default AppShell;
