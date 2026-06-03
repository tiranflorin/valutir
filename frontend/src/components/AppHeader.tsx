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
    Typography,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppHeader: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    const initials = user?.name?.slice(0, 1)?.toUpperCase() || user?.email?.slice(0, 1)?.toUpperCase() || 'U';

    const handleClose = () => setAnchorEl(null);

    return (
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(10px)' }}>
            <Container maxWidth="lg">
                <Toolbar disableGutters sx={{ minHeight: 72, justifyContent: 'space-between' }}>
                    <Typography
                        component={RouterLink}
                        to="/"
                        variant="h6"
                        sx={{
                            textDecoration: 'none',
                            color: 'text.primary',
                            fontWeight: 800,
                            letterSpacing: 0.3,
                        }}
                    >
                        ValuTir
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {isAuthenticated ? (
                            <>
                                <Button component={RouterLink} to="/my-subs" color="inherit">
                                    My Subs
                                </Button>
                                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="inherit">
                                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
                                        {initials}
                                    </Avatar>
                                </IconButton>
                                <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
                                    <MenuItem disabled>
                                        <AccountCircleOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />
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
                                <Button component={RouterLink} to="/login" color="inherit">
                                    Login
                                </Button>
                                <Button component={RouterLink} to="/register" variant="contained">
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
