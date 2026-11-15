import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { LEGAL, REVENUE_COMMITMENT } from '../legal';
import '../styles/legal.css';

/**
 * Why ValuTir exists and whose side it is on. Every line here is a statement about how the product
 * works today; change the page in the same change as the behaviour it describes.
 */
const AboutPage: React.FC = () => (
    <Box className="dashboard-page settings-page legal-page about-page">
        <AppHeader />
        <Container component="main" className="settings-container legal-container">
            <Box className="settings-page-heading">
                <h1>Why ValuTir exists</h1>
                <p>
                    Subscriptions are built to be forgotten: they renew on their own, free trials turn into payments, prices go up
                    quietly, and cancelling is often harder than signing up. ValuTir is built for the other side: the person paying.
                    It helps you know what you pay, when you pay it, and whether each subscription is still worth it.
                </p>
            </Box>

            <Paper className="settings-card legal-card" elevation={0}>
                <section id="for">
                    <h2>What ValuTir is for</h2>
                    <ul>
                        <li>Every subscription in one list, with what it costs a month and a year, for home and for work.</li>
                        <li>An email before each renewal, and before a free trial turns into a paid plan.</li>
                        <li>Noticing what changed: when you update a price, the old one stays in its price history.</li>
                        <li>
                            Deciding, one by one, what stays. Cancelling is done with the provider; for common services, ValuTir links to
                            their manage or cancel page.
                        </li>
                    </ul>
                </section>

                <section id="money">
                    <h2>How ValuTir makes money</h2>
                    <p>
                        Only from {REVENUE_COMMITMENT.source}: a single {LEGAL.unlockPrice} payment (VAT included) for lists of more than 50
                        active subscriptions. {REVENUE_COMMITMENT.never} {REVENUE_COMMITMENT.why}
                    </p>
                </section>

                <section id="wont">
                    <h2>What ValuTir won’t do</h2>
                    <ul>
                        <li>Connect to your bank or read your transactions. You type what you pay for.</li>
                        <li>Promise savings it can’t know. When two subscriptions look like the same thing twice, it says they’re worth a look, and you decide.</li>
                        <li>Use the tricks it helps you avoid: the free plan needs no card, and the unlock is one payment that never renews.</li>
                    </ul>
                </section>

                <section id="principles">
                    <h2>How features are chosen</h2>
                    <ul>
                        <li>A feature has to help you decide something about your own subscriptions.</li>
                        <li>Warnings have to be right. When ValuTir can’t be sure, it says nothing rather than raise a false alarm.</li>
                        <li>Facts on these pages come from sources we checked. Amounts in your account are the ones you entered.</li>
                    </ul>
                </section>

                <section id="data">
                    <h2>Your data stays yours</h2>
                    <p>
                        Download everything as JSON or CSV, or delete your account and every subscription in it from your profile, at any
                        time. The <RouterLink to="/privacy">Privacy policy</RouterLink> lists what is stored, why and for how long.
                    </p>
                </section>

                <section id="who">
                    <h2>Who runs ValuTir</h2>
                    <p>
                        ValuTir is operated by {LEGAL.legalName}, {LEGAL.address}, under the EU’s GDPR. Questions or ideas are welcome
                        through the <RouterLink to="/contact">contact page</RouterLink>.
                    </p>
                </section>
            </Paper>
        </Container>
        <AppFooter />
    </Box>
);

export default AboutPage;
