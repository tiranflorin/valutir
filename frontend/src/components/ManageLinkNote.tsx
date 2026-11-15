import React from 'react';

/**
 * Shown with every manage-or-cancel link: it points at the provider's own site, which ValuTir
 * doesn't control, so it can stop working when the provider changes its pages.
 */
const ManageLinkNote: React.FC = () => (
    <small className="manage-link-note">
        Opens the provider’s own site. Providers change their pages, so this link can stop working; if it does, look for the
        subscription in your account settings there, and update the link here.
    </small>
);

export default ManageLinkNote;
