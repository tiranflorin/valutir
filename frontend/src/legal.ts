/**
 * Details shown on the legal pages (Privacy, Terms, Refunds). Fill in the bracketed placeholders
 * before launch and have the pages reviewed (docs/go-live-checklist.md). Bump the dates whenever the
 * text of a page changes.
 */
export const LEGAL = {
    controller: 'TechDivision',
    legalName: 'TECHDIVISION SRL',
    address: '26 Simion Barnutiu Street, Oradea, Bihor County, Romania',
    // registrationNumber: 'Trade Register no. J2021002842128',
    taxId: 'RO44441041',
    /** The law the Terms are governed by. */
    governingLaw: 'Romania',
    privacyUpdated: '7 November 2026',
    termsUpdated: '3 November 2026',
    refundsUpdated: '3 November 2026',
    /** Days after purchase in which the one-time unlock is refunded on request, no questions asked. */
    refundDays: 14,
    unlockPrice: '€19.99',
} as const;

/**
 * The company identity as printed on every legal page: name, registered office, Trade Register
 * number, and CUI (required on Romanian commercial websites by Law 365/2002, art. 5).
 */
export const OPERATOR_DETAILS = [LEGAL.legalName, LEGAL.address , LEGAL.taxId].join(', ');
