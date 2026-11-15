import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import '../styles/legal.css';

type Place = { id: string; title: string; steps: React.ReactNode[] };

/**
 * Where subscriptions hide, and exactly how to check each place. Menu paths change: check them
 * against the provider when editing, and remove a step rather than guess.
 */
const PLACES: Place[] = [
    {
        id: 'statements',
        title: 'Bank and card statements',
        steps: [
            'Go back 12 months, not one: yearly and quarterly charges show up only once or a few times a year.',
            'Check every card and account you have used online, including old cards and virtual cards.',
            'Look for the same merchant every month, and for small amounts: they are the easiest to miss.',
        ],
    },
    {
        id: 'app-store',
        title: 'App Store (iPhone, iPad, Mac)',
        steps: [
            'On iPhone or iPad: Settings → your name → Subscriptions. The list also shows expired subscriptions.',
            'On a Mac: App Store → your name → Account Settings → Subscriptions → Manage.',
            'Apps bought this way are billed by Apple, so your statement shows Apple, not the app.',
        ],
    },
    {
        id: 'google-play',
        title: 'Google Play (Android)',
        steps: [
            'Play Store app → your profile picture → Payments & subscriptions → Subscriptions.',
            'As with Apple, the charge is from Google, not from the app.',
        ],
    },
    {
        id: 'paypal',
        title: 'PayPal',
        steps: [
            'Settings → Payments → Manage automatic payments lists every service allowed to charge you through PayPal.',
            'These charges often appear on your bank statement as PayPal, not as the service.',
        ],
    },
    {
        id: 'accounts',
        title: 'Amazon, Microsoft and Google accounts',
        steps: [
            'Amazon: Your Account → Memberships & Subscriptions, for Prime and the subscriptions you added through Amazon.',
            <>Microsoft: <a href="https://account.microsoft.com/services" target="_blank" rel="noopener noreferrer">account.microsoft.com/services</a>, for Microsoft 365 and Xbox Game Pass.</>,
            <>Google: <a href="https://one.google.com/" target="_blank" rel="noopener noreferrer">one.google.com</a> for storage, and <a href="https://www.youtube.com/paid_memberships" target="_blank" rel="noopener noreferrer">youtube.com/paid_memberships</a> for YouTube Premium and Music.</>,
        ],
    },
    {
        id: 'inbox',
        title: 'Your email inbox',
        steps: [
            'Search for “receipt”, “invoice”, “renewal”, “your subscription” and “trial”.',
            'This also finds services paid with a card you no longer check.',
        ],
    },
    {
        id: 'phone-bill',
        title: 'Your phone bill',
        steps: ['Some apps and games bill through your mobile operator. Look for third-party charges on your phone bill.'],
    },
    {
        id: 'trials',
        title: 'Free trials',
        steps: ['Anything you started “for free” in the last few months: check whether it has turned into a paid plan, and when it will.'],
    },
    {
        id: 'shared',
        title: 'Family and shared plans',
        steps: ['Check whether you pay for a family plan nobody else uses, or whether people in your household pay for the same service separately.'],
    },
];

/** Public guide: where to look for every subscription you pay for. */
const FindSubscriptionsPage: React.FC = () => (
    <Box className="dashboard-page settings-page legal-page find-subscriptions-page">
        <AppHeader />
        <Container component="main" className="settings-container legal-container">
            <Box className="settings-page-heading">
                <h1>How to find every subscription you pay for</h1>
                <p>
                    Subscriptions hide in more places than your bank statement: app stores, PayPal, your phone bill and trials that
                    quietly turned paid. Go through these places once, write down each recurring charge with its price and how often it
                    is billed, and you have the full list.
                </p>
            </Box>

            <Paper className="settings-card legal-card" elevation={0}>
                <nav className="legal-summary" aria-label="Places to check">
                    <h2>Places to check</h2>
                    <ol>
                        {PLACES.map((place) => <li key={place.id}><a href={`#${place.id}`}>{place.title}</a></li>)}
                    </ol>
                </nav>

                {PLACES.map((place) => (
                    <section key={place.id} id={place.id}>
                        <h2>{place.title}</h2>
                        <ul>{place.steps.map((step, index) => <li key={index}>{step}</li>)}</ul>
                    </section>
                ))}

                <section id="next">
                    <h2>When you have the list</h2>
                    <ul>
                        <li><RouterLink to="/calculator">Add it up in the calculator</RouterLink>: the monthly, yearly and five-year cost, without an account.</li>
                        <li><RouterLink to="/register">Keep it in ValuTir</RouterLink> to get an email before each charge and before a free trial ends.</li>
                        <li>
                            Cancel with each provider. In ValuTir, a subscription’s page links to the provider’s manage or cancel page: filled in
                            when you pick a common service from the list, or add the link yourself. Providers change their pages over time, so a
                            saved link can go out of date.
                        </li>
                    </ul>
                </section>
            </Paper>
        </Container>
        <AppFooter />
    </Box>
);

export default FindSubscriptionsPage;
