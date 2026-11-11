import React from 'react';
import { type CatalogService, catalogIconSrc } from '../data/services';

/** A catalog service's icon, or its first letter on a tile when it has none. */
const CatalogTile: React.FC<{ service: CatalogService }> = ({ service }) => {
    const src = catalogIconSrc(service);
    return src
        ? <img className="catalog-tile" src={src} alt="" />
        : <span className="catalog-tile letter" aria-hidden="true">{service.name.charAt(0).toUpperCase()}</span>;
};

export default CatalogTile;
