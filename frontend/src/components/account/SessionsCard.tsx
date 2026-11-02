import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Paper } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { logoutEverywhereRequest } from '../../services/account';
import { useAccountErrorHandler } from './useAccountErrorHandler';

const SessionsCard: React.FC = () => {
    const { token, clearSession } = useAuth();
    const navigate = useNavigate();
    const handleError = useAccountErrorHandler();
    const [error, setError] = useState('');
    const [working, setWorking] = useState(false);

    const signOutEverywhere = async () => {
        setError('');
        if (!token) {
            return;
        }
        try {
            setWorking(true);
            await logoutEverywhereRequest(token);
            clearSession();
            navigate('/login', { replace: true });
        } catch (requestError) {
            const message = handleError(requestError);
            if (message) {
                setError(message);
            }
            setWorking(false);
        }
    };

    return (
        <Paper className="settings-card">
            <div className="settings-section-heading">
                <h2>Signed-in devices</h2>
                <p>Lost a device or signed in somewhere shared? Sign out everywhere, including this browser.</p>
            </div>
            {error && <Alert severity="error">{error}</Alert>}
            <div className="settings-save-row">
                <Button variant="outlined" disabled={working} onClick={() => void signOutEverywhere()}>
                    {working ? 'Signing out...' : 'Sign out of all devices'}
                </Button>
            </div>
        </Paper>
    );
};

export default SessionsCard;
