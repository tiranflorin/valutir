import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { LEGAL, OPERATOR_DETAILS } from '../legal';
import './RecurringScreens.css';
import './LegalPage.css';

/**
 * Refund policy for the one-time unlock. A full refund in Stripe revokes the unlock automatically
 * (StripeWebhookHandler, charge.refunded); a partial refund keeps it. Legal details live in src/legal.ts.
 */
const RefundPage: React.FC = () => (
    <Box className="dashboard-page settings-page legal-page">
        <AppHeader />
        <Container component="main" className="settings-container legal-container">
            <Box className="settings-page-heading">
                <h1>Refund policy</h1>
                <p>{LEGAL.refundDays}-day money-back guarantee on the one-time unlock. Last updated {LEGAL.refundsUpdated}.</p>
            </Box>

            <Paper className="settings-card legal-card" elevation={0}>
                <section className="legal-summary" aria-label="Summary">
                    <h2>The short version</h2>
                    <ul>
                        <li>Changed your mind? Ask within {LEGAL.refundDays} days of paying and you get the full {LEGAL.unlockPrice} back. No questions asked.</li>
                        <li>The free plan stays free, so there&apos;s nothing else to refund or cancel. The unlock never renews.</li>
                    </ul>
                </section>

                <section id="guarantee">
                    <h2>1. The {LEGAL.refundDays}-day guarantee</h2>
                    <p>
                        If you bought the one-time unlock, you can ask for a full refund within {LEGAL.refundDays} days of
                        the payment, for any reason or none. This guarantee covers at least what the EU 14-day right of
                        withdrawal would give you, so you don&apos;t lose anything by getting access straight away.
                    </p>
                </section>

                <section id="how">
                    <h2>2. How to ask</h2>
                    <ol>
                        <li>Send us a message through the <RouterLink to="/contact">contact form</RouterLink>, from or mentioning the email address of your ValuTir account.</li>
                        <li>Write &ldquo;Refund&rdquo; and, if you like, why. Feedback helps, but you don&apos;t have to give a reason.</li>
                    </ol>
                    <p>
                        We confirm and issue the refund within 5 business days. The money goes back to the card or account
                        you paid with. Depending on your bank, it can take another 5 to 10 business days to show up.
                    </p>
                </section>

                <section id="after">
                    <h2>3. What happens to your account</h2>
                    <ul>
                        <li>Your account goes back to the free plan as soon as the refund is processed.</li>
                        <li>Nothing is deleted. If you have more than 50 active subscriptions, they all stay visible and editable; you just can&apos;t add or reactivate more until you&apos;re back under 50.</li>
                        <li>You can buy the unlock again later if you want.</li>
                    </ul>
                </section>

                <section id="later">
                    <h2>4. After {LEGAL.refundDays} days</h2>
                    <p>
                        After {LEGAL.refundDays} days the purchase is final, except where the law gives you a right to a
                        refund: for example, if the unlock doesn&apos;t work as described and we can&apos;t fix it within a
                        reasonable time. If something isn&apos;t working, <RouterLink to="/contact">tell us</RouterLink>.
                    </p>
                </section>

                <section id="charges">
                    <h2>5. Charges you don&apos;t recognize, and disputes</h2>
                    <p>
                        The charge appears on your statement as <strong>VALUTIR</strong>. If you don&apos;t recognize it, or think
                        you were charged twice, contact us first. We&apos;ll check it and refund any mistake straight away. You can
                        also dispute a payment with your bank; if you do, the account returns to the free plan.
                    </p>
                </section>

                <section id="other">
                    <h2>6. Other charges</h2>
                    <p>
                        ValuTir only tracks your other subscriptions. It never charges you for them. To get money back from
                        a service you track (a streaming service, software, and so on), contact that provider directly.
                    </p>
                    <p>
                        The full terms are in the <RouterLink to="/terms">Terms of use</RouterLink>, and how we handle your
                        data is in the <RouterLink to="/privacy">Privacy policy</RouterLink>.
                    </p>
                    <p>Refunds are issued by {LEGAL.controller} ({OPERATOR_DETAILS}).</p>
                </section>
            </Paper>
        </Container>
        <AppFooter />
    </Box>
);

export default RefundPage;
