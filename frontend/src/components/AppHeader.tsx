import React, { useState } from 'react';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Tooltip,
    useTheme,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

const AppHeader: React.FC = () => {
    const theme = useTheme();
    const { mode, toggleColorMode } = useAppTheme();
    const { isAuthenticated, user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    const initials =
        user?.name?.slice(0, 1)?.toUpperCase() ||
        user?.email?.slice(0, 1)?.toUpperCase() ||
        'U';

    const handleClose = () => setAnchorEl(null);

    return (
        <AppBar
            position="sticky"
            elevation={0}
            color="transparent"
            sx={{
                background:
                    theme.palette.mode === 'dark'
                        ? 'rgba(12, 19, 32, 0.76)'
                        : 'rgba(255, 255, 255, 0.68)',
                backdropFilter: 'blur(14px)',
                borderBottom: `1px solid ${theme.palette.divider}`,
            }}
        >
            <Container maxWidth="lg">
                <Toolbar disableGutters sx={{ minHeight: 74, justifyContent: 'space-between' }}>
                    <BrandLogo size="header" />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                            <IconButton onClick={toggleColorMode} color="inherit">
                                {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                            </IconButton>
                        </Tooltip>

                        {isAuthenticated ? (
                            <>
                                <Button
                                    component={RouterLink}
                                    to="/my-subs"
                                    color="inherit"
                                    sx={{ borderRadius: 999, px: 2, fontWeight: 700 }}
                                >
                                    My Subs
                                </Button>

                                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="inherit">
                                    <Avatar
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            fontSize: 14,
                                            fontWeight: 700,
                                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        }}
                                    >
                                        {initials}
                                    </Avatar>
                                </IconButton>

                                <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
                                    <MenuItem disabled>
                                        <AccountCircleOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                                        {user?.email}
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => {
                                            handleClose();
                                            navigate('/my-subs');
                                        }}
                                    >
                                        My Subs
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => {
                                            handleClose();
                                            logout();
                                            navigate('/login');
                                        }}
                                    >
                                        Logout
                                    </MenuItem>
                                </Menu>
                            </>
                        ) : (
                            <>
                                <Button
                                    component={RouterLink}
                                    to="/login"
                                    color="inherit"
                                    sx={{ borderRadius: 999, px: 2, fontWeight: 700 }}
                                >
                                    Login
                                </Button>
                                <Button
                                    component={RouterLink}
                                    to="/register"
                                    variant="contained"
                                    sx={{
                                        borderRadius: 999,
                                        px: 2.5,
                                        fontWeight: 700,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    }}
                                >
                                    Create Account
                                </Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default AppHeader;
