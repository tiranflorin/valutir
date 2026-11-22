import React from 'react';
import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import HeroCalculator from '../components/calculator/HeroCalculator';
import { LEGAL, REVENUE_COMMITMENT } from '../legal';

/**
 * The front of ValuTir: what your digital life costs (the calculator), why it matters, the app that
 * keeps it under control, and why you can trust it with the list. Every number here is either an
 * example labelled as one or the visitor's own input; nothing promises a saving.
 */
const HomePage: React.FC = () => (
    <Box className="landing-page">
        <AppHeader />

        <main>
            <HeroCalculator
                intro={(
                    <>
                        <h1>What you pay for, and when it charges.</h1>
                        <p>
                            Tap the services you pay for and type each price. You’ll see your year, the months the big bills land in,
                            and the email ValuTir sends before each charge, so you decide in time whether it’s still worth it.
                        </p>
                    </>
                )}
                actions={(
                    <>
                        <div className="hero-actions">
                            <Button component={RouterLink} to="/register" variant="contained" className="primary-action">
                                Create a free account <span aria-hidden="true">&nbsp;→</span>
                            </Button>
                            <Button href="#the-app" variant="outlined" className="secondary-action">
                                See how it works
                            </Button>
                        </div>
                        <p className="free-caption">Free for up to {LEGAL.freeActiveLimit} subscriptions · No card · No bank login · No ads</p>
                    </>
                )}
            />

            <section className="landing-section pillars-section" id="why" aria-labelledby="pillars-title">
                <div className="section-head">
                    <h2 id="pillars-title">Subscriptions are built to be forgotten.</h2>
                    <p>
                        They renew on their own, free trials turn into payments, prices go up quietly, and cancelling is often harder
                        than signing up. ValuTir is built for the other side: the person paying.
                    </p>
                    <p className="section-source">
                        In a 2022 US survey, people guessed they spent $86 a month on subscriptions; adding them up one by one came
                        to $219.{' '}
                        <a href="https://www.cnbc.com/2022/09/06/consumers-underestimate-monthly-subscription-costs-by-at-least-100.html" target="_blank" rel="noopener noreferrer">
                            C+R Research, via CNBC
                        </a>
                    </p>
                </div>
                <div className="pillar-grid">
                    <article className="pillar-card">
                        <h3>Save money</h3>
                        <p>Find the subscriptions you forgot about, the free trials about to turn paid, and the services that do the same job twice.</p>
                        <RouterLink to="/find-subscriptions">Where forgotten subscriptions hide →</RouterLink>
                    </article>
                    <article className="pillar-card">
                        <h3>Stay in control</h3>
                        <p>Every renewal date on one calendar, an email before the charge, and for common services a link to the provider’s page when you decide to cancel.</p>
                        <a href="#the-app">See the app →</a>
                    </article>
                    <article className="pillar-card">
                        <h3>Your digital stack</h3>
                        <p>AI assistants, design tools, hosting and domains: see what your software really costs, for home and for work.</p>
                        <RouterLink to="/ai-tools-cost-calculator">What does your AI stack cost? →</RouterLink>
                    </article>
                </div>
            </section>

            <section className="landing-section capabilities-section" id="the-app" aria-labelledby="the-app-title">
                <div className="section-head">
                    <h2 id="the-app-title">From a list to a decision.</h2>
                    <p>Add what you pay for, see where the money goes, get a heads-up before each charge, and decide what stays.</p>
                </div>
                <div className="cap-grid cap-grid--four">
                    <article className="cap-card">
                        <span className="cap-num">01</span>
                        <h3>Pick what you pay for</h3>
                        <p>Tick services from a list of common ones, or type your own. You enter the price you pay; nothing is connected to your bank.</p>
                        <div className="example-box"><small>Example</small><strong>Netflix · Spotify · iCloud+</strong><span>Three added in under a minute.</span></div>
                    </article>
                    <article className="cap-card">
                        <span className="cap-num">02</span>
                        <h3>See your year</h3>
                        <p>Monthly and yearly cost, spending by category and the next 12 months of charges, so a yearly bill never catches you out. When a price goes up, the old one stays in its price history.</p>
                        <div className="example-box"><small>Example · €7.99 monthly</small><strong>€95.88 a year</strong><span>The yearly cost if it keeps renewing.</span></div>
                    </article>
                    <article className="cap-card">
                        <span className="cap-num">03</span>
                        <h3>A reminder before the charge</h3>
                        <p>An email before each renewal, and before a free trial turns into a paid plan. Trials come first on your list.</p>
                        <div className="example-box"><small>Example</small><strong>Trial ends tomorrow</strong><span>First charge €19.99 if you keep it.</span></div>
                    </article>
                    <article className="cap-card">
                        <span className="cap-num">04</span>
                        <h3>Keep or cancel, one by one</h3>
                        <p>Go through your subscriptions one at a time and decide. Cancelling is done with the provider; for common services, ValuTir links to their page.</p>
                        <div className="example-box"><small>Your call</small><strong>Keep · Cancel · Skip</strong><span>Then see what cancelling frees up.</span></div>
                    </article>
                </div>
                <p className="the-app-note">
                    <strong>Freelance, or run a one-person company?</strong> Mark the tools your business pays for, such as hosting,
                    domains and design software, as Business: they get their own view, apart from your household bills. Both views are free.
                </p>
            </section>

            <section className="landing-section trust-section" id="trust" aria-labelledby="trust-title">
                <div className="section-head">
                    <h2 id="trust-title">Your list stays yours.</h2>
                    <p>Knowing what you pay for is personal. Here is what ValuTir does and doesn’t do with it.</p>
                </div>
                <ul className="trust-grid">
                    <li><strong>How ValuTir makes money: only {REVENUE_COMMITMENT.source}.</strong> {REVENUE_COMMITMENT.never} {REVENUE_COMMITMENT.why}</li>
                    <li><strong>No bank login.</strong> You type what you pay for. ValuTir never connects to your bank or reads your transactions.</li>
                    <li><strong>Card details go to Stripe.</strong> If you buy the unlock, Stripe takes the payment. ValuTir never sees your card.</li>
                    <li><strong>Take it or delete it.</strong> Download everything as JSON or CSV, or delete your account and all its subscriptions, at any time.</li>
                </ul>
                <p className="trust-footnote">
                    Operated by {LEGAL.legalName}, Romania, under the EU’s GDPR. The details are in the <RouterLink to="/privacy">Privacy policy</RouterLink>, and <RouterLink to="/about">why ValuTir exists</RouterLink> on its own page.
                </p>
            </section>

            <section className="landing-section pricing-section" id="free">
                <div className="section-head">
                    <h2>Start free. Keep using it free.</h2>
                    <p>
                        Personal and Business views are part of the free tracker. If your list grows beyond {LEGAL.freeActiveLimit} active
                        subscriptions, there’s a one-time upgrade. No monthly software bill.
                    </p>
                </div>
                <div className="price-band">
                    <div>
                        <h3>Track up to {LEGAL.freeActiveLimit} active subscriptions for free</h3>
                        <p>Your list, monthly and yearly costs, trial dates, the renewal calendar and reminders. The {LEGAL.freeActiveLimit} are shared across Personal and Business.</p>
                    </div>
                    <div className="price-tag"><strong>€0</strong><span>Free forever</span></div>
                </div>
                <div className="price-details">
                    <div className="price-detail"><b>Need more than {LEGAL.freeActiveLimit}?</b>A one-time payment of {LEGAL.unlockPrice} (VAT included) unlocks tracking beyond {LEGAL.freeActiveLimit} active subscriptions. No recurring charge. <RouterLink to="/plans">See the plans</RouterLink></div>
                    <div className="price-detail"><b>{LEGAL.refundDays}-day money-back guarantee</b>If the unlock isn’t for you, ask within {LEGAL.refundDays} days for a full refund. <RouterLink to="/refunds">Refund policy</RouterLink></div>
                </div>
            </section>

            <section className="last-cta">
                <h2>Start with the subscriptions you already know.</h2>
                <p>Add a few services, set the next dates, and see what’s due. You can build the list as you go.</p>
                <Button component={RouterLink} to="/register" variant="contained">Create a free account</Button>
            </section>
        </main>

        <AppFooter />
    </Box>
);

export default HomePage;
