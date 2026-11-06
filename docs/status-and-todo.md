# Status and TODO

Fixed items are removed from this list; the git history records what changed. Items marked **Later** are planned but deliberately deferred.

## Correctness and reliability

1. **Later: tests don't cover the rules that matter most.** Decided for now: backend tests stay database-free. There are 213 backend and 80 frontend tests (the frontend ones include sign-in, password reset, and the full subscription lifecycle against a fake API; the backend ones check authentication on every protected route and the subscription service rules), but no backend test reaches a database. User isolation on subscriptions (user B can't read or change user A's), the subscription create/update/delete flow over HTTP, token revocation through the firewall, and the reminder commands' database queries (claiming a user's day, the reminder log) are untested against a real database. Several service tests are mock-heavy and assert implementation details.
   - Plan: a base test case on a real test database (`valutir_test`, tables truncated per test), and a few HTTP and command scenario tests replacing most mock tests.
   - CI: the CI env file points `DATABASE_URL` at host `db`, which the GitHub Actions Postgres service doesn't provide (it needs `127.0.0.1` and a published port), and the workflow never generates JWT keys. Both block database tests in CI. For the keys, generate a pair in each run: export a random `JWT_PASSPHRASE` (`openssl rand -hex 32`; a real environment variable overrides the env files) and run `lexik:jwt:generate-keypair`, so no secret is stored anywhere. Today's tests never sign a token, so CI needs no keys yet.
2. **Later: run the scheduled commands and send email on AWS.** Payment reminders are built (see [Scheduled commands](scheduled-commands.md)) but nothing schedules them in production yet:
   - Schedule the commands hourly with a systemd timer on the EC2 instance, running them in one-off containers of the deployed image (`advance-billing-dates` before `reminders:send`, plus `cache:pool:prune`); see [architecture.md](architecture.md#scheduled-commands). The units belong in `valutir-infra`. Still to decide: how a failed run raises an alert.
   - Send email through Amazon SES with the existing Mailer SMTP transport (`MAILER_DSN=smtp://…@email-smtp.eu-central-1.amazonaws.com:587`), after verifying the sending domain (SPF, DKIM, DMARC) and requesting production access out of the SES sandbox.
   - Set `DEFAULT_URI` to the API's public URL (the one-click unsubscribe header is built from it) and `FRONTEND_URL` to the app's origin (links in the email, and CORS).
   - Later: handle SES bounces and complaints (SNS) by turning reminders off for those addresses.

## Security and operations

3. **Optional hardening: keep the JWT in an HttpOnly cookie.** The SPA stores it in `localStorage` (`valutir_auth_token`), so a successful XSS could steal it for later use. The CSP and React's escaping make that unlikely, and an XSS could still call the API while the page is open, so the gain is limited. If done: the API sets an `HttpOnly; Secure; SameSite=Strict` cookie (Lexik supports cookie tokens). The app and API hostnames count as the same site, so no Worker or single origin is needed. The SPA sends `credentials: 'include'`, CORS allows credentials for `FRONTEND_URL`, and logout clears the cookie. Add CSRF protection (AGENTS.md requires it for cookie auth): an `Origin` check on state-changing requests, because sibling subdomains count as same-site. Keep the 24-hour lifetime (or about 8 hours); skip refresh tokens, since the blocklist and `tokenVersion` already revoke tokens server-side.
4. **Cookies and browser storage (GDPR / ePrivacy).** Reviewed on 2026-11-03. Nothing ValuTir stores today needs consent, so **no cookie banner is needed yet**. EU law (ePrivacy Art. 5(3), which covers `localStorage` as well as cookies) only exempts storage that is *strictly necessary* for a service the user asked for, so every item still has to be disclosed, and anything new has to be checked before it ships.
    - **What's stored:**
      - `localStorage.valutir_auth_token`: the sign-in token. Strictly necessary.
      - `localStorage.valutir_dashboard_view`: the Personal/Business view the user picked themselves. A user-interface preference, also exempt.
      - The API sets no cookies (stateless JWT; checked: no `Set-Cookie` on sign-in). Sessions are turned off (`framework.session: false`), so no future change can create a session cookie by accident.
      - The theme mode isn't stored.
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

6. **Most paid-plan tools aren't built yet.** The one-time unlock is paid through Stripe and lifts the 50-subscription limit. The Plans page also lists project and cost-center allocation, a bookkeeping export, custom reminder timing, and price history, and none of them exist yet. (Everyone can already download their subscriptions as a plain CSV from "Download my data"; the paid bookkeeping export would add business columns such as cost center.) Build them, or take them off the page before charging real customers. Also missing: no receipt or invoice email from ValuTir (Stripe can send receipts: Dashboard → Settings → Emails), and no USD or RON prices, since everyone is charged in EUR.
7. **The Business view is only a filter** on the `b2b` flag (no business account or team).
8. **Later: who pays a shared bill.** Household sharing assumes you pay the full bill and others owe you their share. If someone else pays, the charge isn't on your card but you owe your share; that needs a "payer" field, calendar charges that follow it, and settle-up reminders.
9. **Later: family-plan savings.** Suggest a family plan when several people pay for the same service separately (fits the savings-suggestions roadmap; needs named household members or real household accounts).
10. **Later: real household accounts.** Invite members by email so one shared subscription is visible to everyone, each seeing their own share. This changes the rule that subscriptions are visible only to their owner, so it needs its own access-rule design and tests.
11. **Later (low priority): a small admin area.** A page for `ROLE_ADMIN` accounts (granted with `app:create-admin`) that lists users with their email, name, roles, verified and unlocked status, and sign-up date (`user` has no creation date yet, so that needs a `createdAt` column and a migration), and can delete a user. Today `ROLE_ADMIN` grants nothing and the only way to see or remove accounts is the database.
    - API: `/api/admin/*`, allowed only for `ROLE_ADMIN` in `security.yaml` `access_control` (a frontend route guard isn't enough). Paginated list; never return password hashes or token data.
    - Deleting a user reuses `AccountService::deleteAccount()`, so the same rules apply: subscriptions are removed, purchases keep their row with `user_id` set to NULL. An admin can't delete their own account from there, so the last admin can't lock themselves out.
    - Log each admin view and deletion (admin user ID, target user ID; no emails or other personal data) and test that non-admins get 403.
    - Before shipping, check whether the Privacy policy needs to mention operator access to account data.
