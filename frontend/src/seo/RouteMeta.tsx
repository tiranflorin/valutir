import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { SITE_URL } from '../config';
import { pageHead } from './pages';

const setMeta = (selector: string, create: () => HTMLElement, attribute: string, value: string | null) => {
    let element = document.head.querySelector<HTMLElement>(selector);
    if (value === null) {
        element?.remove();
        return;
    }
    if (!element) {
        element = create();
        document.head.appendChild(element);
    }
    element.setAttribute(attribute, value);
};

const metaNamed = (name: string) => () => {
    const element = document.createElement('meta');
    element.setAttribute('name', name);
    return element;
};

/**
 * Keeps the title, description, robots and canonical tags right as the user moves between pages.
 * The first page load already has them from the prerendered HTML (build/prerender.ts).
 */
const RouteMeta: React.FC = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        const head = pageHead(pathname, SITE_URL);
        document.title = head.title;
        setMeta('meta[name="description"]', metaNamed('description'), 'content', head.description);
        setMeta('meta[name="robots"]', metaNamed('robots'), 'content', head.indexable ? 'index, follow' : 'noindex, nofollow');
        setMeta('link[rel="canonical"]', () => {
            const link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            return link;
        }, 'href', head.canonical ?? null);
    }, [pathname]);

    return null;
};

export default RouteMeta;
