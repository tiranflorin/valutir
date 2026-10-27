import React from 'react';
import { Button } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useAppTheme } from '../context/ThemeContext';

type Props = {
    placement?: 'header' | 'floating';
};

const ThemeModeToggle: React.FC<Props> = ({ placement = 'header' }) => {
    const { mode, toggleColorMode } = useAppTheme();
    const isDark = mode === 'dark';

    return (
        <Button
            className={placement === 'floating' ? 'auth-theme-toggle' : 'theme-toggle'}
            variant="outlined"
            startIcon={isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            onClick={toggleColorMode}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={isDark}
        >
        </Button>
    );
};

export default ThemeModeToggle;
