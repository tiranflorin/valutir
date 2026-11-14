import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { LEGAL, OPERATOR_DETAILS } from '../legal';
import './RecurringScreens.css';
import './LegalPage.css';

/**
 * Terms of use. Keep the plan and payment sections in sync with the Plans page, FreePlanLimit, and
 * UnlockOffer; legal details live in src/legal.ts. To be reviewed by a lawyer before launch.
 */
const TermsPage: React.FC = () => (
    <Box className="dashboard-page settings-page legal-page">
        <AppHeader />
        <Container component="main" className="settings-container legal-container">
            <Box className="settings-page-heading">
                <h1>Terms of use</h1>
                <p>The rules for using ValuTir. Last updated {LEGAL.termsUpdated}.</p>
            </Box>

            <Paper className="settings-card legal-card" elevation={0}>
                <section className="legal-summary" aria-label="Summary">
                    <h2>The short version</h2>
                    <ul>
                        <li>ValuTir is free for up to 50 active subscriptions. A one-time {LEGAL.unlockPrice} payment lifts that limit; it never renews.</li>
                        <li>Changed your mind? You get a full refund within {LEGAL.refundDays} days, no questions asked.</li>
                        <li>Your data is yours. You can delete your account at any time.</li>
                        <li>ValuTir helps you keep track of things. It doesn&apos;t pay, cancel, or manage subscriptions with providers for you.</li>
                    </ul>
                </section>

                <section id="about">
                    <h2>1. About these terms</h2>
                    <p>
                        ValuTir is operated by {LEGAL.controller} ({OPERATOR_DETAILS}).
                        By creating an account or using ValuTir, you agree to these terms. How we handle your data is
                        explained in the <RouterLink to="/privacy">Privacy policy</RouterLink>.
                    </p>
                </section>

                <section id="service">
                    <h2>2. What ValuTir does</h2>
                    <p>
                        ValuTir is a web tool for tracking your recurring subscriptions: costs, billing dates, trials, and
                        reminders before payments. It works only with the information you enter. It isn&apos;t connected to
                        your bank or your providers, so it never pays, cancels, or changes anything with them.
                    </p>
                    <p>
                        Billing dates, totals, and reminders are calculated from what you enter and are for your
                        information only. Always check the actual terms and charges with your provider. ValuTir isn&apos;t
                        financial, tax, or legal advice.
                    </p>
                </section>

                <section id="account">
                    <h2>3. Your account</h2>
                    <ul>
                        <li>You must be at least 16 years old and give a real email address you control. Some features, such as payment reminders and the one-time unlock, work only after you confirm it.</li>
                        <li>An account is for one person. Keep your password private, and tell us if you think someone else has used your account.</li>
                        <li>You can change your details or delete your account at any time from your <RouterLink to="/profile">Profile</RouterLink>. Deleting it removes your subscriptions permanently.</li>
                    </ul>
                </section>

                <section id="plans">
                    <h2>4. Free plan and one-time unlock</h2>
                    <ul>
                        <li><strong>Free plan:</strong> personal and business tracking, the calendar, and reminders, for up to 50 active subscriptions (active or in trial) in total. Above 50, your existing records stay available to view, edit, and cancel; adding or reactivating another needs the unlock.</li>
                        <li><strong>One-time unlock:</strong> {LEGAL.unlockPrice}, VAT included. It lifts the 50-subscription limit for your account. It&apos;s a single payment and never renews.</li>
                        <li>Features shown on the <RouterLink to="/plans">Plans page</RouterLink> as planned are not part of the purchase until they&apos;re released. We may add them to the unlock at no extra cost, but we don&apos;t promise them.</li>
                        <li>Payment is handled by Stripe on its secure checkout page. Your account is unlocked once Stripe confirms the payment, usually within seconds, or a few days for bank transfers or direct debit.</li>
                        <li>The unlock belongs to your account and can&apos;t be transferred. If the payment is refunded or reversed, the account returns to the free plan.</li>
                    </ul>
                </section>

                <section id="refunds">
                    <h2>5. Refunds and your right of withdrawal</h2>
                    <p>
                        You can get a full refund within {LEGAL.refundDays} days of buying the unlock, without giving a reason.
                        This is at least as generous as the EU 14-day right of withdrawal. How to ask, and what happens
                        after, is explained in the <RouterLink to="/refunds">Refund policy</RouterLink>.
                    </p>
                </section>

                <section id="use">
                    <h2>6. Fair use</h2>
                    <p>Please don&apos;t:</p>
                    <ul>
                        <li>Break the law with ValuTir, or store other people&apos;s personal data in it without a right to.</li>
                        <li>Try to access other accounts, test or bypass our security, or overload the service, for example with automated sign-ups or scraping.</li>
                        <li>Store highly sensitive data, such as full card numbers or passwords, in notes or other fields.</li>
                    </ul>
                    <p>We may suspend or close accounts that seriously or repeatedly break these rules. Where possible, we&apos;ll warn you first and explain why.</p>
                </section>

                <section id="content">
                    <h2>7. Your content</h2>
                    <p>
                        Everything you enter stays yours. You allow us to store and process it only to run ValuTir for you,
                        as described in the <RouterLink to="/privacy">Privacy policy</RouterLink>.
                    </p>
                </section>

                <section id="availability">
                    <h2>8. Availability and changes to ValuTir</h2>
                    <p>
                        We work to keep ValuTir available and your data safe, but we can&apos;t promise it will always be
                        uninterrupted or error-free, or that every reminder will arrive. Email delivery depends on your
                        provider. We may improve or change features over time. If we ever shut ValuTir down, we&apos;ll
                        tell you at least 60 days in advance.
                    </p>
                </section>

                <section id="liability">
                    <h2>9. Liability</h2>
                    <p>
                        ValuTir is a tracking aid. We aren&apos;t responsible for charges, renewals, or cancellations with your
                        providers, or for losses caused by information you entered or a reminder you didn&apos;t receive. Our
                        total liability to you is limited to what you paid us in the 12 months before the claim.
                    </p>
                    <p>
                        None of this limits liability that can&apos;t be limited by law, such as for intent or gross negligence,
                        or your rights as a consumer under the law of the country where you live.
                    </p>
                </section>

                <section id="law">
                    <h2>10. Changes, law, and contact</h2>
                    <ul>
                        <li>If we change these terms, we&apos;ll update the date at the top. For important changes, we&apos;ll tell you by email or in the app at least 30 days in advance. If you don&apos;t agree, you can delete your account; if that happens within {LEGAL.refundDays} days of buying the unlock, you get a refund.</li>
                        <li>These terms are governed by the law of {LEGAL.governingLaw}. As a consumer, you also keep the protection of the mandatory laws of the country where you live, and you can bring a claim there.</li>
                        <li>Questions or complaints? Use the <RouterLink to="/contact">contact form</RouterLink>. We&apos;ll try to solve things with you first.</li>
                    </ul>
                </section>
            </Paper>
        </Container>
        <AppFooter />
    </Box>
);

export default TermsPage;
