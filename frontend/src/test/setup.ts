import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    // Every test starts signed out and with the real fetch; tests opt in through test/api.ts.
    window.localStorage.clear();
    vi.unstubAllGlobals();
});
