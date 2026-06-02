import React from 'react';
import { Box, useTheme } from '@mui/material';
import DarkModeToggle from './DarkModeToggle';

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #0A0E1A 0%, #0D1F3C 50%, #0A1628 100%)'
                        : 'linear-gradient(135deg, #E3F2FD 0%, #E8F5E9 50%, #EDE7F6 100%)',
                px: 2,
                py: 4,
            }}
        >
            <DarkModeToggle />
            {children}
        </Box>
    );
};

export default AuthLayout;
