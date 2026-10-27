import React, { useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Container,
    Divider,
    Menu,
    MenuItem,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import ThemeModeToggle from './ThemeModeToggle';
import '../pages/RecurringScreens.css';

const AppHeader: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const { mode } = useAppTheme();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isLanding = pathname === '/';
    const initials = user?.name?.slice(0, 1)?.toUpperCase() || user?.email?.slice(0, 1)?.toUpperCase() || 'U';

    const closeMenu = () => setAnchorEl(null);

    return (
        <Box component="header" className="site-header">
            <Container maxWidth="xl" className="site-header-inner">
                <RouterLink className="site-brand" to={isAuthenticated ? '/my-subs' : '/'} aria-label="ValuTir home">
                    <img src={mode === 'dark' ? '/brand/header-logo-dark.svg' : '/brand/header-logo.svg'} alt="ValuTir" />
                </RouterLink>

                <Box component="nav" className="site-nav" aria-label="Main navigation">
                    {isAuthenticated ? (
                        <>
                            <Button component={RouterLink} to="/my-subs" className={pathname === '/my-subs' ? 'active' : ''}>
                                Subs
                            </Button>
                            <Button component={RouterLink} to="/calendar" className={pathname === '/calendar' ? 'active' : ''}>
                                Calendar
                            </Button>
                            <ThemeModeToggle />
                            <Button
                                className="account-trigger"
                                aria-label="Open account menu"
                                aria-haspopup="true"
                                onClick={(event) => setAnchorEl(event.currentTarget)}
                                endIcon={<KeyboardArrowDownRoundedIcon />}
                            >
                                <Avatar className="account-avatar">{initials}</Avatar>
                            </Button>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={closeMenu}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                PaperProps={{ className: 'account-menu' }}
                            >
                                <MenuItem disabled className="account-menu-email">{user?.email}</MenuItem>
                                <Divider />
                                <MenuItem disabled>Profile</MenuItem>
                                <MenuItem disabled>Preferences</MenuItem>
                                <Divider />
                                <MenuItem
                                    onClick={() => {
                                        closeMenu();
                                        logout();
                                        navigate('/');
                                    }}
                                >
                                    Log out
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <>
                            {isLanding && <a href="#how-it-works">How it works</a>}
                            {isLanding && <a href="#business">For business</a>}
                            {isLanding && <a href="#free">Free plan</a>}
                            <ThemeModeToggle />
                            <Button component={RouterLink} to="/login" className="signin-link">Sign in</Button>
                            <Button component={RouterLink} to="/register" variant="contained" className="header-cta">
                                Try it out
                            </Button>
                        </>
                    )}
                </Box>
            </Container>
        </Box>
    );
};

export default AppHeader;
