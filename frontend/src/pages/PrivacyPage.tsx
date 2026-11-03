import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { LEGAL, OPERATOR_DETAILS } from '../legal';
import './RecurringScreens.css';
import './LegalPage.css';

/** Keep this page in sync with what the app collects and stores (AGENTS.md); legal details live in src/legal.ts. */
type StorageItem = {
    name: string;
    kind: string;
    provider: string;
    purpose: string;
    lifetime: string;
};

/** Everything stored in the browser. All of it is strictly necessary, so none of it needs consent. */
const storageItems: StorageItem[] = [
    {
        name: 'valutir_auth_token',
        kind: 'Local storage',
        provider: 'ValuTir',
        purpose: 'Keeps you signed in. Removed when you sign out.',
        lifetime: 'Until you sign out; the token itself expires after 24 hours',
    },
    {
        name: 'valutir_dashboard_view',
        kind: 'Local storage',
        provider: 'ValuTir',
        purpose: 'Remembers whether you last chose the Personal or Business view.',
        lifetime: 'Until you clear your browser storage',
    },
    {
        name: 'cf_clearance, __cf_bm',
        kind: 'Cookies',
        provider: 'Cloudflare',
        purpose: 'Bot and abuse protection: on the contact form (Turnstile) and, when bot protection is on, in front of our API.',
        lifetime: 'From 30 minutes up to about a day',
    },
    {
        name: 'Stripe cookies',
        kind: 'Cookies',
        provider: 'Stripe',
        purpose: 'Set by Stripe on checkout.stripe.com only, if you buy the one-time unlock (fraud prevention and the payment itself).',
        lifetime: 'See Stripe’s cookie policy',
    },
];

const PrivacyPage: React.FC = () => (
    <Box className="dashboard-page settings-page legal-page">
        <AppHeader />
        <Container className="settings-container legal-container">
            <Box className="settings-page-heading">
                <h1>Privacy policy</h1>
                <p>What ValuTir collects, why, and what you can do about it. Last updated {LEGAL.privacyUpdated}.</p>
            </Box>

            <Paper className="settings-card legal-card" elevation={0}>
                <section className="legal-summary" aria-label="Summary">
                    <h2>The short version</h2>
                    <ul>
                        <li>We collect only what's needed to run your account and send the reminders you ask for.</li>
                        <li>No ads, no tracking, no analytics, and we never sell or share your data for marketing.</li>
                        <li>Card details go straight to Stripe; we never see them.</li>
                        <li>You can change your data or delete your account, with all of its subscriptions, at any time from your profile.</li>
                    </ul>
                </section>

                <section id="controller">
                    <h2>1. Who is responsible</h2>
                    <p>
                        ValuTir is operated by {LEGAL.controller} ({OPERATOR_DETAILS}),
                        the controller of your personal data under the EU General Data Protection Regulation (GDPR).
                        For any privacy question or request, use our <RouterLink to="/contact">contact form</RouterLink>.
                    </p>
                </section>

                <section id="data">
                    <h2>2. What we collect and why</h2>
                    <div className="legal-table-wrap">
                        <table className="legal-table">
                            <thead>
                                <tr>
                                    <th scope="col">Data</th>
                                    <th scope="col">Why</th>
                                    <th scope="col">Legal basis</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Account: email address, name, password (stored only as a secure hash), and your settings (currency, time zone, reminders on or off)</td>
                                    <td>To create your account, sign you in, and keep your settings</td>
                                    <td>Contract (Art. 6(1)(b) GDPR)</td>
                                </tr>
                                <tr>
                                    <td>The subscriptions you enter: service name, price, currency, billing dates, status, category, notes, payment method label, household sharing</td>
                                    <td>To show your dashboard and calendar, and to work out upcoming charges</td>
                                    <td>Contract</td>
                                </tr>
                                <tr>
                                    <td>Reminder history: which upcoming charges we've already reminded you about</td>
                                    <td>To send each payment reminder only once</td>
                                    <td>Contract</td>
                                </tr>
                                <tr>
                                    <td>One-time unlock: which purchase, its Stripe reference, amount, and status. Stripe handles your name, billing address, VAT ID, and payment details</td>
                                    <td>To unlock your account and handle refunds</td>
                                    <td>Contract; keeping payment records is a legal obligation (Art. 6(1)(c))</td>
                                </tr>
                                <tr>
                                    <td>Contact form: your email address and message</td>
                                    <td>To answer you</td>
                                    <td>Legitimate interest in replying (Art. 6(1)(f))</td>
                                </tr>
                                <tr>
                                    <td>Technical data: IP address, and browser signals checked by Cloudflare Turnstile on the contact form</td>
                                    <td>Security: rate limits on sign-up, sign-in, and password reset, and blocking bots and abuse. We store IP addresses only as one-way hashes for rate limiting, and in error logs</td>
                                    <td>Legitimate interest in keeping the service secure</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        Please don't put sensitive information in notes or the payment method field. For example, never
                        enter full card numbers; a label like &ldquo;Visa ending 4242&rdquo; is enough.
                    </p>
                    <p>We don't make automated decisions about you, and ValuTir isn't meant for children under 16.</p>
                </section>

                <section id="emails">
                    <h2>3. Emails we send</h2>
                    <p>
                        Account emails (confirming your address, password resets, email changes, account deletion) are part
                        of the service. Payment reminders are on by default because they're what ValuTir is for. Turn them
                        off at any time in <RouterLink to="/preferences">Preferences</RouterLink> or with the link in
                        every reminder. We never send marketing emails.
                    </p>
                </section>

                <section id="sharing">
                    <h2>4. Who processes your data for us</h2>
                    <p>We share data only with the providers needed to run ValuTir, under data processing agreements:</p>
                    <ul>
                        <li><strong>Amazon Web Services</strong>: servers and database in the EU (Frankfurt), and sending our emails (Amazon SES).</li>
                        <li><strong>Cloudflare</strong>: hosting the website, protecting our servers, and the contact form's bot check (Turnstile).</li>
                        <li><strong>Stripe</strong>: processing the one-time unlock payment. For payments, Stripe also acts as a controller under its own <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>.</li>
                    </ul>
                    <p>
                        Some of these companies are based in the United States. Where data leaves the EU, the transfer is
                        protected by the EU&ndash;US Data Privacy Framework or the European Commission&apos;s Standard
                        Contractual Clauses. We don&apos;t sell your data, and we only disclose it to authorities when the law requires it.
                    </p>
                </section>

                <section id="retention">
                    <h2>5. How long we keep it</h2>
                    <ul>
                        <li><strong>Your account and subscriptions:</strong> until you delete your account. Deleting it removes them permanently. Subscriptions you delete are hidden right away but kept with your account, so it can remember why you cancelled them, until the account is deleted.</li>
                        <li><strong>Sign-in, verification, and reset links:</strong> they expire after 24 hours (password reset links after one hour) and are deleted once used.</li>
                        <li><strong>Rate-limit counters</strong> (hashed IP addresses): up to one hour.</li>
                        <li><strong>Error logs:</strong> up to 30 days.</li>
                        <li><strong>Payment records:</strong> for as long as tax and accounting law requires (in Romania, generally up to 10 years). If you delete your account, these records are kept without any link to you.</li>
                        <li><strong>Contact messages:</strong> as long as needed to handle your request, then deleted.</li>
                    </ul>
                </section>

                <section id="rights">
                    <h2>6. Your rights</h2>
                    <p>Under the GDPR you can:</p>
                    <ul>
                        <li><strong>See and correct</strong> your data: most of it is on your <RouterLink to="/profile">Profile</RouterLink> and in your subscriptions.</li>
                        <li><strong>Delete</strong> your account and all of its data: Profile &rarr; Delete account.</li>
                        <li><strong>Get a copy</strong> of your data (access and portability), <strong>restrict</strong> or <strong>object to</strong> processing: ask us through the <RouterLink to="/contact">contact form</RouterLink>. We answer within one month.</li>
                        <li><strong>Complain</strong> to a data protection authority, such as the Romanian ANSPDCP (<a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer">dataprotection.ro</a>) or the one where you live.</li>
                    </ul>
                </section>

                <section id="cookies">
                    <h2>7. Cookies and browser storage</h2>
                    <p>
                        ValuTir uses only what's strictly necessary to work. That's why there's no cookie banner: EU law
                        (Article 5(3) of the ePrivacy Directive) doesn't require consent for these. If we ever add
                        anything that isn't strictly necessary, such as analytics, we'll ask for your consent first.
                    </p>
                    <div className="legal-table-wrap">
                        <table className="legal-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Provider</th>
                                    <th scope="col">Purpose</th>
                                    <th scope="col">Lifetime</th>
                                </tr>
                            </thead>
                            <tbody>
                                {storageItems.map((item) => (
                                    <tr key={item.name}>
                                        <td><code>{item.name}</code></td>
                                        <td>{item.kind}</td>
                                        <td>{item.provider}</td>
                                        <td>{item.purpose}</td>
                                        <td>{item.lifetime}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p>You can clear these in your browser settings at any time; you'll just need to sign in again.</p>
                </section>

                <section id="security">
                    <h2>8. Security</h2>
                    <p>
                        Connections are encrypted (HTTPS), passwords are stored only as secure hashes, and access to your data
                        is limited to your own account. If a breach ever puts your data at risk, we'll tell you and the
                        authorities as the law requires.
                    </p>
                </section>

                <section id="changes">
                    <h2>9. Changes</h2>
                    <p>
                        If we change this policy, we'll update the date at the top. For important changes, we'll also let
                        you know by email or in the app before they take effect.
                    </p>
                </section>
            </Paper>
        </Container>
        <AppFooter />
    </Box>
);

export default PrivacyPage;
