import React, { useState } from 'react';
import { Alert, Button, Paper } from '@mui/material';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { useAccountExport } from '../../hooks/useAccountExport';

/** "Download my data": a copy of everything ValuTir keeps about the account (GDPR access and portability). */
const DataExportCard: React.FC = () => {
    const { download, working, error } = useAccountExport();
    const [done, setDone] = useState('');

    const start = async (kind: 'json' | 'csv') => {
        setDone('');
        if (await download(kind)) {
            setDone(kind === 'json' ? 'Your data file is downloading.' : 'Your subscriptions spreadsheet is downloading.');
        }
    };

    return (
        <Paper className="settings-card">
            <div className="settings-section-heading">
                <h2>Download my data</h2>
                <p>
                    Get a copy of everything ValuTir keeps about you: your account details, every subscription
                    (deleted ones too), purchases and the reminders we sent. The file is made when you ask and
                    isn’t stored on our servers.
                </p>
            </div>
            <ul className="export-contents">
                <li><strong>All my data (JSON)</strong>: the complete copy, readable by other apps.</li>
                <li><strong>Subscriptions (CSV)</strong>: your current subscriptions as a spreadsheet, with your share of shared bills.</li>
            </ul>
            {error && <Alert severity="error">{error}</Alert>}
            {done && <Alert severity="success">{done}</Alert>}
            <div className="settings-save-row export-actions">
                <Button
                    variant="contained"
                    startIcon={<FileDownloadRoundedIcon />}
                    disabled={working !== null}
                    onClick={() => void start('json')}
                >
                    {working === 'json' ? 'Preparing...' : 'Download all my data (JSON)'}
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<FileDownloadRoundedIcon />}
                    disabled={working !== null}
                    onClick={() => void start('csv')}
                >
                    {working === 'csv' ? 'Preparing...' : 'Download subscriptions (CSV)'}
                </Button>
            </div>
        </Paper>
    );
};

export default DataExportCard;
