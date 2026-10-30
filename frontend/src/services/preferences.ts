export type DefaultCurrency = 'EUR' | 'USD' | 'RON';

const supportedCurrencies: DefaultCurrency[] = ['EUR', 'USD', 'RON'];

const storageKey = (email?: string | null) =>
    `valutir_default_currency:${email?.trim().toLowerCase() || 'default'}`;

export const getDefaultCurrency = (email?: string | null): DefaultCurrency => {
    const savedCurrency = window.localStorage.getItem(storageKey(email));
    return supportedCurrencies.includes(savedCurrency as DefaultCurrency)
        ? savedCurrency as DefaultCurrency
        : 'EUR';
};

export const saveDefaultCurrency = (email: string | null | undefined, currency: DefaultCurrency) => {
    window.localStorage.setItem(storageKey(email), currency);
};
