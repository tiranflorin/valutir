export type MockSubscription = {
    id: string;
    name: string;
    category: string;
    amount: number;
    currency: string;
    billingCycle: 'Monthly' | 'Yearly';
    nextBillingDate: string;
    status: 'Active' | 'Trial';
    description: string;
};

export const mockSubscriptions: MockSubscription[] = [
    {
        id: 'netflix',
        name: 'Netflix',
        category: 'Entertainment',
        amount: 15.99,
        currency: 'EUR',
        billingCycle: 'Monthly',
        nextBillingDate: '2026-07-18',
        status: 'Active',
        description: 'Standard plan for movies and TV series.',
    },
    {
        id: 'spotify',
        name: 'Spotify',
        category: 'Music',
        amount: 10.99,
        currency: 'EUR',
        billingCycle: 'Monthly',
        nextBillingDate: '2026-07-24',
        status: 'Trial',
        description: 'Premium music streaming subscription.',
    },
];
