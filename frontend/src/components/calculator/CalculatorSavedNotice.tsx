import React from 'react';
import { Alert } from '@mui/material';
import type { CalculatorSaveResult } from '../../services/calculatorList';

const day = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${iso}T00:00:00`));

const names = (list: string[]) => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

/** What CalculatorListSaver added to the account from the calculator, shown on the dashboard. */
const CalculatorSavedNotice: React.FC<{ result: CalculatorSaveResult }> = ({ result }) => (
    <>
        {(result.added.length > 0 || result.skipped.length > 0) && (
            <Alert severity="success" sx={{ mb: 2 }} data-testid="calculator-saved">
                {result.added.length > 0 && (
                    <>
                        Added {result.added.length} subscription{result.added.length === 1 ? '' : 's'} from the calculator: {names(result.added)}.
                        {' '}The next charge is set to {day(result.nextBillingDate)}; open one to change its date.
                    </>
                )}
                {result.skipped.length > 0 && <> Already in your list, so not added again: {names(result.skipped)}.</>}
            </Alert>
        )}
        {result.failed.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
                Couldn’t add {names(result.failed.map((item) => item.name))} from the calculator: {result.failed[0].message}
            </Alert>
        )}
    </>
);

export default CalculatorSavedNotice;
