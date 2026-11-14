import { formatCurrency } from './money';
import type { SharedResult } from './calculator';
import { saveFile } from './download';

const WIDTH = 1200;
const HEIGHT = 630;

/** The share card as a PNG, drawn in the browser. Null when canvas isn't available. */
export const drawShareCard = (result: SharedResult, siteHost: string): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) return Promise.resolve(null);

    const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#f6faf5');
    gradient.addColorStop(1, '#dcefe1');
    context.fillStyle = gradient;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    const font = '"Inter", "Helvetica Neue", Arial, sans-serif';
    context.fillStyle = '#32754e';
    context.font = `800 26px ${font}`;
    context.fillText('MY SUBSCRIPTIONS COST', 80, 150);

    context.fillStyle = '#17241d';
    context.font = `800 132px ${font}`;
    context.fillText(formatCurrency(Math.round(result.yearly), result.currency).replace(/\.00$/, ''), 72, 300);
    context.font = `700 44px ${font}`;
    context.fillText('a year', 80, 370);

    context.fillStyle = '#5d6d63';
    context.font = `500 32px ${font}`;
    const detail = `${result.count} subscription${result.count === 1 ? '' : 's'}${result.topCategory ? ` · most on ${result.topCategory}` : ''}`;
    context.fillText(detail, 80, 440);

    context.fillStyle = '#176b43';
    context.font = `800 34px ${font}`;
    context.fillText(`What do yours cost? ${siteHost}/calculator`, 80, 550);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
};

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

/** Shares the card through the device's share sheet when it can take files, or downloads it. */
export const shareOrDownloadCard = async (result: SharedResult, url: string, siteHost: string): Promise<ShareOutcome> => {
    const blob = await drawShareCard(result, siteHost);
    if (!blob) return 'unavailable';
    const file = new File([blob], 'valutir-subscriptions.png', { type: 'image/png' });
    const text = `My subscriptions cost ${formatCurrency(result.yearly, result.currency)} a year. What do yours cost?`;
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], text, url });
            return 'shared';
        } catch {
            return 'cancelled';
        }
    }
    saveFile(blob, file.name);
    return 'downloaded';
};
