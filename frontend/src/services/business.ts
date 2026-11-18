import { API_URL } from '../config';
import { ApiError, apiErrorMessage, apiRequest, attachmentFilename } from './account';

/** One estimated charge of a business subscription (worked out from its billing date and price history). */
export type BusinessCharge = {
    subscriptionId: number;
    serviceName: string;
    category: string | null;
    manageUrl: string | null;
    /** YYYY-MM-DD. */
    date: string;
    /** The amount on that day, e.g. "12.00". */
    amount: string;
    currency: string;
    /** Paid with the owner's own card on that day, so the company owes it back. */
    paidPersonally: boolean;
    /** Still to come: no invoice yet, so it can't be ticked. */
    upcoming: boolean;
    invoiceFiled: boolean;
};

export type BusinessMonth = { month: string; charges: BusinessCharge[] };

/** A month's business charges; `month` is YYYY-MM, from 36 months back up to this month. */
export const fetchBusinessMonth = (token: string, month: string) =>
    apiRequest<BusinessMonth>(`/api/business/charges?month=${encodeURIComponent(month)}`, {
        token,
        fallbackError: 'Unable to load your business charges.',
    });

export const setInvoiceFiled = (token: string, charge: Pick<BusinessCharge, 'subscriptionId' | 'date'>, filed: boolean) =>
    apiRequest<null>(`/api/business/charges/${charge.subscriptionId}/${charge.date}/invoice`, {
        method: filed ? 'PUT' : 'DELETE',
        token,
        fallbackError: 'Unable to save the tick. Please try again.',
    });

/** The paid accountant export: the business charges from month `from` to month `to` (YYYY-MM) as a CSV. */
export async function fetchAccountantExport(token: string, from: string, to: string): Promise<{ blob: Blob; filename: string }> {
    const query = new URLSearchParams({ from, to });
    const response = await fetch(`${API_URL}/api/business/export.csv?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new ApiError(response.status, apiErrorMessage(data, 'Unable to prepare your download.'));
    }

    return {
        blob: await response.blob(),
        filename: attachmentFilename(response.headers.get('Content-Disposition')) ?? 'valutir-business-charges.csv',
    };
}
