import '@testing-library/jest-dom/vitest';
// Same global stylesheet as main.tsx, so components render with the styles they have in the app.
import '../styles/app.css';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    // Every test starts signed out and with the real fetch; tests opt in through test/api.ts.
    window.localStorage.clear();
    vi.unstubAllGlobals();
});
