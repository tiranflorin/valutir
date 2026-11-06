/**
 * Hands a file to the browser's download. The object URL lives only for this click, so nothing is
 * kept in the page or in browser storage afterwards.
 */
export const saveFile = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Some browsers start the download after the click returns; release the URL a moment later.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
