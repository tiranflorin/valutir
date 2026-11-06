import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccountErrorHandler } from '../components/account/useAccountErrorHandler';
import { type AccountExportKind, fetchAccountExport } from '../services/account';
import { saveFile } from '../utils/download';

/** Downloads the user's data; tracks which download is running and the last error. */
export function useAccountExport() {
    const { token } = useAuth();
    const handleError = useAccountErrorHandler();
    const [working, setWorking] = useState<AccountExportKind | null>(null);
    const [error, setError] = useState('');

    const download = useCallback(async (kind: AccountExportKind, view?: 'personal' | 'business') => {
        if (!token) {
            return false;
        }
        setError('');
        setWorking(kind);
        try {
            const { blob, filename } = await fetchAccountExport(token, kind, view);
            saveFile(blob, filename);
            return true;
        } catch (requestError) {
            const message = handleError(requestError);
            if (message) {
                setError(message);
            }
            return false;
        } finally {
            setWorking(null);
        }
    }, [token, handleError]);

    return { download, working, error };
}
