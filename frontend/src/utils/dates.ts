/**
 * Today's date in the user's local time zone, as YYYY-MM-DD (the value format of <input type="date">).
 * Not `toISOString()`, which gives the UTC date and is "yesterday" or "tomorrow" near midnight.
 */
export const todayIsoDate = (now: Date = new Date()): string => {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
};

/** Whether a YYYY-MM-DD date is before today (local time). YYYY-MM-DD strings sort chronologically. */
export const isBeforeToday = (isoDate: string, now: Date = new Date()): boolean => isoDate < todayIsoDate(now);

/** Whether a YYYY-MM-DD date is after today (local time). */
export const isAfterToday = (isoDate: string, now: Date = new Date()): boolean => isoDate > todayIsoDate(now);
