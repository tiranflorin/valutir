import React from 'react';
import { Avatar, Box, Container, Paper } from '@mui/material';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import DataExportCard from '../components/account/DataExportCard';
import DeleteAccountCard from '../components/account/DeleteAccountCard';
import EmailCard from '../components/account/EmailCard';
import PasswordCard from '../components/account/PasswordCard';
import ProfileDetailsCard from '../components/account/ProfileDetailsCard';
import SessionsCard from '../components/account/SessionsCard';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const initials = user?.name?.slice(0, 1)?.toUpperCase() || user?.email?.slice(0, 1)?.toUpperCase() || 'U';

    return (
        <Box className="dashboard-page settings-page">
            <AppHeader />
            <Container className="settings-container">
                <Box className="settings-page-heading">
                    <h1>Your profile</h1>
                    <p>Manage your account, sign-in details, and devices.</p>
                </Box>

                <Paper className="settings-card">
                    <div className="settings-profile-row">
                        <Avatar className="settings-avatar">{initials}</Avatar>
                        <div>
                            <strong>{user?.name || 'Personal account'}</strong>
                            <span>{user?.email || 'Account details and sign-in settings'}</span>
                        </div>
                    </div>
                </Paper>

                <ProfileDetailsCard />
                <EmailCard />
                <PasswordCard />
                <SessionsCard />
                <DataExportCard />
                <DeleteAccountCard />
            </Container>
            <AppFooter />
        </Box>
    );
};

export default ProfilePage;
