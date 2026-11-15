import React from 'react';
import { catalogIconSrc, catalogServiceOf } from '../data/services';

type Size = 'sm' | 'md' | 'lg';

/**
 * A subscription's icon: its catalog service's logo (also for a plan name, "Spotify Family"), or the
 * first letter of its name on a tile, so a service is never shown with someone else's picture.
 * sm sits beside a name in a list (20 px), md is a table or row icon (34 px), lg goes with a heading (48 px).
 */
const ServiceIcon: React.FC<{ serviceName: string; size?: Size }> = ({ serviceName, size = 'md' }) => {
    const service = catalogServiceOf(serviceName);
    const src = service ? catalogIconSrc(service) : null;
    const className = `service-icon service-icon--${size}`;
    return src
        ? <img className={className} src={src} alt="" />
        : <span className={`${className} letter`} aria-hidden="true">{serviceName.trim().charAt(0).toUpperCase() || '?'}</span>;
};

export default ServiceIcon;
