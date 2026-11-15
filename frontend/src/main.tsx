import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// The app's global stylesheet: layout, header, and every page's shared styles. Imported before App,
// so the page-specific stylesheets (src/styles/, imported by their pages) come after it and win ties.
import './styles/app.css';
import App from './App';

// Public pages arrive prerendered (build/prerender.ts) for crawlers. The app renders fresh over that
// HTML instead of hydrating it: a signed-in visitor's header differs from the signed-out version, so
// hydration would mismatch. Emotion keeps the prerendered styles, so nothing flashes.
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
