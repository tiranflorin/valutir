import React from 'react';
import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import './RecurringScreens.css';

const HomePage: React.FC = () => (
    <Box className="landing-page">
        <AppHeader />

        <main>
            <section className="landing-hero" id="top">
                <div className="hero-copy-block">
                    <div className="eyebrow">Recurring expenses, in view</div>
                    <h1>Enjoy the trial.<br /><em>Remember the last day.</em></h1>
                    <p>
                        Keep your subscriptions, renewal dates and real monthly cost in one clear place.
                        Get a heads-up before the trial ends and the first charge lands.
                    </p>
                    <div className="hero-actions">
                        <Button component={RouterLink} to="/register" variant="contained" className="primary-action">
                            Try it out <span aria-hidden="true">&nbsp;→</span>
                        </Button>
                        <Button href="#how-it-works" variant="outlined" className="secondary-action">
                            See how it works
                        </Button>
                    </div>
                    <div className="free-caption">Free to start · No card required · Personal and business tracking</div>
                    <div className="promise-line">
                        <span><b>✓</b>Your list, your dates</span>
                        <span><b>✓</b>No bank connection required</span>
                    </div>
                </div>

                <div className="hero-preview-wrap" aria-label="Preview of the subscription dashboard">
                    <div className="hero-orbit">
                        <div className="date-tab"><small>OCT</small><b>28</b></div>
                        <div className="mini-dashboard">
                            <div className="mini-dashboard-head">
                                <span>Your recurring expenses</span><span className="personal-tag">PERSONAL</span>
                            </div>
                            <div className="mini-muted">Tracked each month</div>
                            <div className="mini-total">€86.96 <small>/ month</small></div>
                            <div className="mini-annual">€1,043.52 annual run rate</div>
                            <div className="mini-chart" aria-hidden="true">
                                <svg viewBox="0 0 320 52" preserveAspectRatio="none">
                                    <path d="M0 39 C25 36,34 24,58 29 S92 38,111 24 S150 29,168 19 S201 27,220 13 S262 25,282 9 S307 16,320 4" fill="none" stroke="#42a56a" strokeWidth="2.5" />
                                    <path d="M0 39 C25 36,34 24,58 29 S92 38,111 24 S150 29,168 19 S201 27,220 13 S262 25,282 9 S307 16,320 4 L320 52 L0 52Z" fill="#eaf5ed" opacity=".8" />
                                </svg>
                            </div>
                            <div className="mini-next">Next on your list</div>
                            <div className="mini-renewal">
                                <img src="/service-icons/spotify.svg" alt="" />
                                <div className="mini-renewal-copy">Spotify<small>Renews in 3 days</small></div>
                                <span className="mini-price">€10.99</span>
                            </div>
                            <div className="mini-renewal">
                                <img src="/service-icons/design-app.svg" alt="" />
                                <div className="mini-renewal-copy">Design app · trial<small>First charge tomorrow</small></div>
                                <span className="mini-price">€19.99</span>
                            </div>
                        </div>
                        <aside className="trial-float">
                            <div className="trial-float-label">Trial ending · tomorrow</div>
                            <strong>Design app</strong>
                            <p>If it stays active, the provider may charge your card on 28 October.</p>
                            <p className="first-charge">First charge · €19.99 / month</p>
                        </aside>
                    </div>
                </div>
            </section>

            <div className="proof-strip">
                <p><strong>A small habit that prevents expensive surprises.</strong></p>
                <div className="proof-item"><b>01</b>Know what you pay</div>
                <div className="proof-item"><b>02</b>See what renews next</div>
                <div className="proof-item"><b>03</b>Decide before it charges</div>
            </div>

            <section className="landing-section trial-section" id="how-it-works">
                <div className="trial-steps">
                    <div className="trial-step">
                        <span className="step-number">1</span>
                        <div><strong>Add the trial</strong><small>Service, trial end date, and first paid price</small></div>
                        <span className="step-value">€0 today</span>
                    </div>
                    <div className="trial-step">
                        <span className="step-number">2</span>
                        <div><strong>See the date before it sneaks up</strong><small>Upcoming list and reminder ahead of conversion</small></div>
                        <span className="step-value">1 day left</span>
                    </div>
                    <div className="trial-alert">
                        <strong>Tomorrow · Design app trial ends</strong><br />
                        Keep it, cancel with the provider, or review the plan before the first €19.99 charge.
                    </div>
                </div>
                <div className="trial-copy">
                    <div className="section-kicker">Trials deserve their own warning</div>
                    <h2>Free today can mean paid tomorrow.</h2>
                    <p>
                        ValuTir puts trial end dates ahead of ordinary renewals, with the first charge beside them.
                        You can decide while there’s still time to act.
                    </p>
                    <p className="truth">
                        We remind and organize. You cancel with the service provider. ValuTir never claims a trial
                        has been cancelled for you.
                    </p>
                </div>
            </section>

            <section className="landing-section capabilities-section">
                <div className="section-head">
                    <div className="section-kicker">A clearer recurring bill list</div>
                    <h2>Know the amount, the date, and what you want to do.</h2>
                    <p>No buried transactions or mystery totals. Add the services you use and see the next decision at a glance.</p>
                </div>
                <div className="cap-grid">
                    <article className="cap-card">
                        <span className="cap-num">01</span>
                        <h3>See the cost in two timeframes</h3>
                        <p>Compare monthly equivalents with yearly commitments, so an annual plan doesn’t look cheaper just because it bills once.</p>
                        <div className="example-box"><small>Example · €7.99 monthly</small><strong>€95.88 over a year</strong><span>The yearly cost if it keeps renewing.</span></div>
                    </article>
                    <article className="cap-card">
                        <span className="cap-num">02</span>
                        <h3>Put every renewal on the calendar</h3>
                        <p>Check what’s due this week, what’s coming later, and which annual charge needs room in the budget.</p>
                        <div className="example-box"><small>Next seven days</small><strong>€42.97 · 3 charges</strong><span>Dates and amounts, together.</span></div>
                    </article>
                    <article className="cap-card">
                        <span className="cap-num">03</span>
                        <h3>Review before you keep paying</h3>
                        <p>Mark a service for review, decide if it still earns its place, then record your choice. Possible savings depend on what you choose.</p>
                        <div className="example-box"><small>Your call</small><strong>Keep · change · cancel</strong><span>Review tracked; provider action stays yours.</span></div>
                    </article>
                </div>
            </section>

            <section className="landing-section business-section" id="business">
                <div>
                    <div className="section-kicker">One account, two useful views</div>
                    <h2>Home bills and work tools can live in the same place.</h2>
                    <p>
                        Switch between Personal and Business. Mark each subscription once, then see household services
                        on one side and hosting, domains, design tools and annual renewals on the other.
                    </p>
                    <p>Start with the free business view. Optional business tools can add project or cost-center context and export-ready summaries.</p>
                    <Button component={RouterLink} to="/register" variant="contained" className="primary-action">
                        Track personal and business costs
                    </Button>
                </div>
                <div className="business-preview">
                    <div className="business-preview-head"><strong>Business recurring expenses</strong><span>Personal&nbsp; | &nbsp;Business</span></div>
                    <div className="business-total">€340.00 <small>/ month</small></div>
                    <div className="business-caption">€4,080 annual run rate · annual bills shown in full</div>
                    <div className="business-row"><span>Cloud hosting · monthly</span><span>€48 · in 2 days</span></div>
                    <div className="business-row"><span>GitHub · monthly</span><span>€18 · in 5 days</span></div>
                    <div className="business-row"><span>Domain · annual renewal</span><span>€120 · in 21 days</span></div>
                </div>
            </section>

            <section className="landing-section pricing-section" id="free">
                <div className="section-head">
                    <div className="section-kicker">Free for the everyday list</div>
                    <h2>Start free. Keep using it free.</h2>
                    <p>
                        Personal and Business views are part of the free tracker. If your list grows beyond 50 active
                        subscriptions, or you need advanced business tools, there will be a one-time upgrade. No monthly software bill.
                    </p>
                </div>
                <div className="price-band">
                    <div>
                        <h3>Track up to 50 active subscriptions for free</h3>
                        <p>Keep the core: subscription list, monthly and yearly costs, trial dates, renewal calendar and basic reminders. The 50 active items count is shared across Personal and Business.</p>
                    </div>
                    <div className="price-tag"><strong>€0</strong><span>Free forever</span></div>
                </div>
                <div className="price-details">
                    <div className="price-detail"><b>Need more than 50?</b>A one-time payment will unlock tracking beyond 50 active subscriptions. No recurring charge. Check <a href="/#free">Plan</a> </div>
                    <div className="price-detail"><b>Running a small business?</b>Core Business tracking stays free. Optional advanced tools, such as project or cost-center reports, are planned as part of the one-time upgrade.</div>
                </div>
            </section>

            <section className="last-cta">
                <h2>Start with the subscriptions you already know.</h2>
                <p>Add a few services, set the next dates, and see what’s due. You can build the list as you go.</p>
                <Button component={RouterLink} to="/register" variant="contained">Try it out — free</Button>
            </section>
        </main>

        <AppFooter />
    </Box>
);

export default HomePage;
