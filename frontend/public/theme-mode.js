// Runs before the first paint: a visitor who chose dark mode in the last 12 hours sees the prerendered
// page dark straight away instead of a light flash. The app (src/utils/themeMode.ts) owns the setting
// and renews or clears it; this only reads the same key. A file, not inline, because the CSP blocks inline scripts.
try {
    if (Number(localStorage.getItem('valutir_theme_mode')) > Date.now()) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
} catch {
    // Storage blocked: the page opens light.
}
