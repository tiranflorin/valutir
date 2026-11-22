# Status and TODO

Fixed items are removed from this list; the git history records what changed. Items marked **Later** are planned but deliberately deferred.

## Correctness and reliability

2. **Later: run the scheduled commands and send email on AWS.** Payment reminders are built and run locally by the `scheduler` Compose service (see [Scheduled commands](scheduled-commands.md)), but nothing schedules them in production yet:
   - Install the systemd service and timer written out in [scheduled-commands.md](scheduled-commands.md#in-production) on the EC2 instance, through `valutir-infra`. They run `bin/scheduled-run` hourly in a one-off container of the deployed image, so the Compose file there needs the `valutir-api` image pinned to the deployed tag. Still to decide: how a failed run raises an alert (the unit's `OnFailure=`).
   - Send email through Amazon SES with the existing Mailer SMTP transport (`MAILER_DSN=smtp://…@email-smtp.eu-central-1.amazonaws.com:587`), after verifying the sending domain (SPF, DKIM, DMARC) and requesting production access out of the SES sandbox.
   - Set `DEFAULT_URI` to the API's public URL (the one-click unsubscribe header is built from it) and `FRONTEND_URL` to the app's origin (links in the email, and CORS).
   - Later: handle SES bounces and complaints (SNS) by turning reminders off for those addresses.

## Security and operations

3. **Optional hardening: keep the JWT in an HttpOnly cookie.** The SPA stores it in `localStorage` (`valutir_auth_token`), so a successful XSS could steal it for later use. The CSP and React's escaping make that unlikely, and an XSS could still call the API while the page is open, so the gain is limited. If done: the API sets an `HttpOnly; Secure; SameSite=Strict` cookie (Lexik supports cookie tokens). The app and API hostnames count as the same site, so no Worker or single origin is needed. The SPA sends `credentials: 'include'`, CORS allows credentials for `FRONTEND_URL`, and logout clears the cookie. Add CSRF protection (AGENTS.md requires it for cookie auth): an `Origin` check on state-changing requests, because sibling subdomains count as same-site. Keep the 24-hour lifetime (or about 8 hours); skip refresh tokens, since the blocklist and `tokenVersion` already revoke tokens server-side.
4. **Cookies and browser storage (GDPR / ePrivacy).** Reviewed on 2026-11-03. Nothing ValuTir stores today needs consent, so **no cookie banner is needed yet**. EU law (ePrivacy Art. 5(3), which covers `localStorage` as well as cookies) only exempts storage that is *strictly necessary* for a service the user asked for, so every item still has to be disclosed, and anything new has to be checked before it ships.
    - **What's stored:**
      - `localStorage.valutir_auth_token`: the sign-in token. Strictly necessary.
      - `localStorage.valutir_dashboard_view`: the Personal/Business view the user picked themselves. A user-interface preference, also exempt.
      - `localStorage.valutir_calculator_list`: written only when a visitor clicks "Save it free" in the calculator; holds that list (names, prices, cadences) until they sign in, when it's saved to the account and removed, or for 7 days at most. Strictly necessary to deliver what they explicitly asked for, so exempt.
      - The API sets no cookies (stateless JWT; checked: no `Set-Cookie` on sign-in). Sessions are turned off (`framework.session: false`), so no future change can create a session cookie by accident.
      - `localStorage.valutir_theme_mode`: written only when the user switches to dark mode; holds when it expires, 12 hours after their last visit (renewed on each visit), and is removed when they switch back to light. A user-interface preference the user set themselves, kept for hours, so exempt.
    - **Third parties:**
      - Cloudflare Turnstile, on the contact page only, may set security cookies on Cloudflare's domain (`cf_clearance`, `__cf_bm`). Security and bot protection are generally treated as strictly necessary, but disclose them.
      - Cloudflare's proxy may set `__cf_bm` on the API hostname while Bot Fight Mode or Bot Management is on. Strictly necessary; disclose it.
      - Stripe Checkout sets its own cookies on `checkout.stripe.com`, where Stripe is the controller. Mention it in the Privacy Policy.
    - **Disclosure: done.** Section 7 of the Privacy Policy (`/privacy`, linked from the footer) lists each item with its provider, purpose and lifetime, and says why none needs consent. Still to do: re-check the Cloudflare cookie names and lifetimes against Cloudflare's own documentation, because third-party cookie lists disagree.
    - **Before adding anything non-essential** (analytics, marketing pixels, embedded video or maps, chat widgets, fonts loaded from Google's CDN), prefer options that store nothing: Cloudflare Web Analytics is cookieless, and fonts can be self-hosted. If consent is still needed, add a consent manager before the feature ships. It must meet these requirements:
      - Scripts are blocked until the user opts in.
      - "Accept" and "Reject" are equally prominent on the first screen, and nothing is pre-ticked.
      - Each consent is recorded with a timestamp and the policy version.
      - The user can withdraw consent at any time from a footer "Cookie settings" link.
      - The user is asked again when the list changes, or after about 12 months.
      - Recommended: the open-source, self-hosted [vanilla-cookieconsent](https://github.com/orestbida/cookieconsent). It needs no new CSP origin and has no fees. Hosted consent managers (Cookiebot, Usercentrics) add a third-party origin and a monthly cost.
    - **Rule:** any new `localStorage`/`sessionStorage` key, cookie, or CSP origin in `frontend/build/securityHeaders.ts` needs this inventory updated first (see AGENTS.md).
5. **Lowest priority: purge old soft-deleted subscriptions.** Add an `app:subscriptions:purge-deleted` command, run by the hourly systemd timer, that archives or removes subscriptions soft-deleted longer than a retention period. Update the Privacy policy's retention section ("kept with your account until the account is deleted") in the same change.

## Product gaps and mocks

6. **Paid plan: what's left.** Every paid feature on the Plans page is built (2026-11-18): no limit on active subscriptions, the accountant export (TODO #7 C), and custom reminder timing (each subscription's "Remind me", 1 to 30 days before the charge). Still missing: no receipt or invoice email from ValuTir (Stripe can send receipts: Dashboard → Settings → Emails), and no USD or RON prices, since everyone is charged in EUR.
7. **Business view for one-person companies (planned and built 2026-11-18: B, C and D).** It's for freelancers and creators who run a one-person company (an LTD, an SRL, a GmbH): the tools the company pays for, kept apart from household bills, and handed to the accountant each month; the app's copy says so. No teams or business accounts: a one-person company has nobody to invite, and the accountant is reached through the export.
    - Built: **B. Invoice checklist, free** (`/invoices`, linked from the Business view): each business charge of a month, ticked "Invoice filed" once its invoice is saved or sent to the accountant, with a link to the provider's billing page while it's missing. Only the tick is stored (`invoice_filing`), never files. **C. Accountant export, paid**: a CSV of a month's or quarter's charges that have gone out (date, service, category, amount, currency, paid by, invoice filed). Both use `App\Business\BusinessCharges` (see [api.md](api.md)).
    - Known limits: a paused subscription shows no charges (the pause date isn't stored), and a change of billing cadence isn't followed back in time (earlier charges use today's schedule with the price of their day).
    - Built: **D. Who paid** (2026-11-18): a business subscription is paid with the company card or the owner's own card ("Paid with" in the form). Switches are kept with their date (`payer_change`), so earlier months keep the card they were paid with. The checklist marks charges paid personally and says what the company owes the owner for the month (one total per currency, charges that have gone out only); the export has a "Paid by" column.
    - Left out on purpose: teams and roles, VAT and reverse-charge handling (country-specific, costly to get wrong), currency conversion (needs a rate source), and reading the owner's email for receipts (against the no-bank-login, minimal-data promise).
8. **Later: who pays a shared bill.** Household sharing assumes you pay the full bill and others owe you their share. If someone else pays, the charge isn't on your card but you owe your share; that needs a "payer" field, calendar charges that follow it, and settle-up reminders.
9. **Later: family-plan savings.** Suggest a family plan when several people pay for the same service separately (fits the savings-suggestions roadmap; needs named household members or real household accounts).
10. **Later: real household accounts.** Invite members by email so one shared subscription is visible to everyone, each seeing their own share. This changes the rule that subscriptions are visible only to their owner, so it needs its own access-rule design and tests.
11. **Later (low priority): delete an account from the admin page.** The read-only admin page (`/admin`) is built: account and purchase counts, free accounts near the limit, background-job health, and an account lookup by email. Still missing: deleting an account for someone who can't sign in (a GDPR request by email). It should reuse `AccountService::deleteAccount()` (subscriptions removed, purchases kept with `user_id` set to NULL), refuse the admin's own account so the last admin can't lock themselves out, log the admin and target user IDs only, and update the Privacy Policy's operator-access sentence (section 8).

## Growth

12. **Google Analytics (waiting for the measurement ID).** Needed to see whether the new homepage and the calculator (feature specs #9 and #10) bring sign-ups. Google Analytics sets cookies (`_ga`, `_ga_<ID>`) and sends visitor data to Google, so it is **not** strictly necessary and needs opt-in consent first (see TODO #4).
    - Config: a `VITE_GA_MEASUREMENT_ID` build variable read only in `src/config.ts`. When it's empty, nothing loads (local, CI and tests).
    - Consent: add the consent manager from TODO #4 (vanilla-cookieconsent) in the same change. Load `gtag.js` only after the visitor accepts "Analytics", start with Google Consent Mode v2 set to denied, and add a footer "Cookie settings" link to withdraw consent.
    - Page views: the SPA changes routes without reloading, so send a `page_view` on each React Router location change. Never send emails, names, subscription data or URLs with tokens (`/reset-password`, `/verify-email`, `/confirm-email`, `/unsubscribe`): strip query strings, or skip those routes.
    - CSP (`frontend/build/securityHeaders.ts`): `https://www.googletagmanager.com` in `script-src`, and `https://*.google-analytics.com` and `https://*.analytics.google.com` in `connect-src`.
    - Privacy Policy: the cookies, their lifetime, Google as a processor with its transfer outside the EU, and how to withdraw consent; update `storageItems` and bump the date.
    - Tests: nothing loads without the ID or before consent; it loads after accepting; the CSP includes the origins only when the ID is set.
13. **Later: decide whether to court US customers, after launch.** Decided for now: target the EU (EU hosting, no bank connection, no data sales are the stronger pitch there) and let US visitors sign up as they already can. Hosting stays in Frankfurt; why that's acceptable for US visitors is in [architecture.md](architecture.md#visitors-outside-europe). Decide once real users can be counted by country: Cloudflare's traffic analytics show requests by country, `user.timezone` roughly locates signed-up users, and Stripe shows buyers' card countries.
    - If US buyers appear: a USD price in `UnlockOffer` (TODO #6), since a EUR charge can add a foreign-transaction fee on US cards, and the legal pages and `src/legal.ts` updated in the same change.
    - US sales tax: some states tax digital products, each above its own sales threshold. Check with an accountant before selling there in volume; Stripe Tax can track the thresholds.
    - Check that `src/data/services.ts` covers the services US users pay for.
