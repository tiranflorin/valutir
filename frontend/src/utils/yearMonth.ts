/** "YYYY-MM" months, as the business endpoints take them. */

export const yearMonthOf = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const addMonths = (yearMonth: string, months: number): string => {
    const [year, month] = yearMonth.split('-').map(Number);
    return yearMonthOf(new Date(year, month - 1 + months, 1));
};

/** "November 2026". */
export const yearMonthLabel = (yearMonth: string): string => {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
};

/**
 * The calendar quarter holding `yearMonth`, cut off at `latest` (a quarter that isn't over yet ends
 * with the current month): its first and last month and a label such as "Q4 2026".
 */
export const quarterOf = (yearMonth: string, latest: string): { from: string; to: string; label: string } => {
    const [year, month] = yearMonth.split('-').map(Number);
    const quarter = Math.floor((month - 1) / 3);
    const from = `${year}-${String(quarter * 3 + 1).padStart(2, '0')}`;
    const end = addMonths(from, 2);

    return { from, to: end < latest ? end : latest, label: `Q${quarter + 1} ${year}` };
};
