import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
    type CalculatorSaveResult,
    UnauthorizedError,
    forgetCalculatorList,
    pendingCalculatorList,
    saveCalculatorList,
} from '../../services/calculatorList';

/**
 * Saves the calculator's list (services/calculatorList.ts) as soon as someone is signed in, in any
 * tab and on any page, then opens the dashboard with a note of what was added. The list is removed
 * from the browser before saving, so a second tab or React's double effects can't add it twice.
 */
const CalculatorListSaver: React.FC = () => {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const { key } = useLocation();

    useEffect(() => {
        if (!token) return;
        const list = pendingCalculatorList();
        if (!list) return;
        forgetCalculatorList();

        saveCalculatorList(token, list)
            .then((calculatorSaved) => navigate('/my-subs', { replace: true, state: { calculatorSaved } }))
            .catch((error: unknown) => {
                if (error instanceof UnauthorizedError) {
                    logout();
                    navigate('/login', { replace: true });
                    return;
                }
                const calculatorSaved: CalculatorSaveResult = {
                    added: [],
                    skipped: [],
                    failed: list.rows.map((row) => ({ name: row.name, message: 'The connection failed.' })),
                    nextBillingDate: '',
                };
                navigate('/my-subs', { replace: true, state: { calculatorSaved } });
            });
        // `key` re-checks after every navigation, e.g. "Save it free" while already signed in.
    }, [token, key, logout, navigate]);

    return null;
};

export default CalculatorListSaver;
