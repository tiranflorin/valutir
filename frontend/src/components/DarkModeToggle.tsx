import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAppTheme } from '../context/ThemeContext';

const DarkModeToggle: React.FC = () => {
    const { mode, toggleColorMode } = useAppTheme();
    const theme = useTheme();

    return (
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
                onClick={toggleColorMode}
                sx={{
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    zIndex: 1300,
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                    },
                }}
                aria-label="toggle dark mode"
            >
                {mode === 'dark' ? (
                    <LightModeIcon sx={{ color: '#FFD54F' }} />
                ) : (
                    <DarkModeIcon sx={{ color: '#1565C0' }} />
                )}
            </IconButton>
        </Tooltip>
    );
};

export default DarkModeToggle;
