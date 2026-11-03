import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type Props = {
    title: string;
};

/**
 * The heading of a "done" state on the auth-style card pages (account created, email confirmed,
 * password updated, ...): a green check on the same line as the title, centered. Styled by
 * .success-heading in RecurringScreens.css, so every success screen looks the same.
 */
const SuccessHeading: React.FC<Props> = ({ title }) => (
    <div className="success-heading">
        <CheckCircleIcon className="success-heading-icon" aria-hidden="true" />
        <h1>{title}</h1>
    </div>
);

export default SuccessHeading;
