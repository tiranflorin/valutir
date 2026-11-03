# ValuTir

ValuTir is a subscription tracker with a Symfony JSON API and a React single-page application. Track subscriptions, what they really cost you, and when they renew, and get an email before each payment.

## Stack

- Symfony 7.4, PHP 8.3, Doctrine ORM, PostgreSQL 16, JWT authentication, and server-side Turnstile verification
- React 18, TypeScript, Vite, MUI, and FullCalendar
- Docker Compose for local development, with MailDev for local email inspection

## Current capabilities

**Accounts and security**
- Registration with validated email, name, and password (8+ characters plus two of uppercase, number, or symbol), rate limited, and without revealing whether an email is already registered. Emails are case-insensitive.
- JWT sign-in with login throttling; sign out of this device or all devices (revoked tokens are rejected server-side).
- Password reset by emailed one-hour link; changing or resetting the password signs out other devices.
- Profile page: change name, change email (confirmed by a link sent to the new address), change password, sign out everywhere, and permanently delete the account and its data.
- Preferences page: default currency for new subscriptions, payment reminders on or off, and time zone. All stored on the account.

**Subscriptions**
- Create, read, update, cancel, re-enable, and soft-delete (deleted subscriptions stay in the database but are hidden from the API).
- Amount, currency, cadence (weekly, monthly, quarterly, or yearly), category, payment method, status (active, trial, other), dates, notes, trial end date, auto-renew, and Personal or Business classification.
- Household sharing for personal subscriptions: split a bill equally between 2–10 people and see your share.
- Next billing and first-charge dates can't be in the past; a provider cancellation date can't be in the future.

**Dashboard and calendar**
- Personal and Business views (Business is a filter on the classification), each with cost and count cards, "Needs attention" trials and renewals, **My subscriptions**, and a separate **Cancelled** section, with filters and sorting.
- Personal view: a SHARED tag, a Shared filter, a household metric, and a **Full bills / My share** switch for the cost totals.
- Calendar month view with recurring charges and filters, plus a selected-day page.

**Reminders**
- At most one email a day per user, and only on days when a payment needs attention (a trial ending or a renewal coming up). Sent after 01:00 in their time zone, with one-click unsubscribe. See [Scheduled commands](#scheduled-commands).

**Other pages**
- Plans page with the one-time unlock (€19.99, VAT included) paid through Stripe Checkout. Free accounts are limited to 50 active (active or trial) subscriptions, enforced by the API. See [Payments](#payments).
- Contact page with server-verified Cloudflare Turnstile, a honeypot, and email delivery.

## Local development

Prerequisites: Docker Desktop (or Docker Engine with Compose). Create `backend/.env` from `backend/.env.sample` and `frontend/.env` from `frontend/.env.dist`, fill in your own values, and generate the JWT key pair. Keep these files and keys out of version control.

```bash
docker compose up -d --build
docker compose exec backend php bin/console lexik:jwt:generate-keypair --skip-if-exists
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

Local services:

| Service | Address |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend health check | http://localhost:8080/health |
| MailDev inbox | http://localhost:1080 |
| PostgreSQL | localhost:5432 |

Useful commands:

```bash
# Follow service logs
docker compose logs -f backend
docker compose logs -f frontend

# Backend tests and code style
docker compose exec backend php vendor/bin/phpunit
docker compose exec backend vendor/bin/php-cs-fixer fix --dry-run --diff

# Frontend checks (all four run in CI)
docker compose run --rm frontend-test npm run type-check
docker compose run --rm frontend-test npm run lint
docker compose run --rm frontend-test npm run test:run
docker compose run --rm frontend-test npm run build

# After changing frontend dependencies, refresh the test container's node_modules volume
docker compose up -d --build --renew-anon-volumes frontend-test
```

## Configuration

Variable names only; templates are `backend/.env.sample` and `frontend/.env.dist`. Never commit real values.

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL`, `DB_PASSWORD` | backend | PostgreSQL connection |
| `APP_SECRET` | backend | Symfony secret (also signs reminder unsubscribe links) |
| `JWT_SECRET_KEY`, `JWT_PUBLIC_KEY`, `JWT_PASSPHRASE` | backend | JWT key pair and its passphrase |
| `MAILER_DSN` | backend | Email transport (MailDev locally, Amazon SES in production) |
| `FRONTEND_URL` | backend | The app's origin (`scheme://host[:port]`, no trailing slash): base URL for links in emails and the only CORS-allowed origin |
| `DEFAULT_URI` | backend | The API's public URL, used for URLs built in console commands (one-click unsubscribe) |
| `SYMFONY_TRUSTED_PROXIES` | backend | Reverse proxies allowed to pass on the client IP and scheme; empty locally. See [Client IPs behind proxies](#client-ips-behind-proxies) |
| `CONTACT_RECIPIENT` | backend | Mailbox for contact-form messages |
| `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` | backend | Cloudflare Turnstile verification |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | backend | Stripe API key and webhook signing secret; empty turns checkout off. See [Payments](#payments) |
| `STRIPE_AUTOMATIC_TAX` | backend | `1` (default) to calculate VAT with Stripe Tax at checkout, `0` to turn it off |
| `VITE_API_URL` | frontend | API base URL; required for builds (a Cloudflare build variable in production). Its origin is also the only API origin the CSP allows |
| `VITE_TURNSTILE_SITE_KEY` | frontend | Cloudflare Turnstile site key (public) |

## API

Send `Authorization: Bearer <token>` with authenticated requests. Errors are always JSON; validation failures return 422 with per-field `errors`.

- **Public:** `POST /api/register`, `POST /api/login_check`, `POST /api/contact`, `POST /api/reset-password/request`, `POST /api/reset-password/new`, `POST /api/profile/email/confirm` (link token), `POST /api/reminders/unsubscribe` (signed link token), `POST /api/billing/webhook` (Stripe-signed), and `GET /health`.
- **Account (authenticated):** `GET`/`PATCH`/`DELETE /api/profile`, `PATCH /api/profile/password`, `POST /api/profile/email`, `POST /api/logout`, `POST /api/logout/all`.
- **Billing (authenticated):** `GET /api/billing` (plan, price, active-subscription usage), `POST /api/billing/checkout` (returns a Stripe Checkout URL).
- **Subscriptions (authenticated, owner only):** `GET`/`POST /api/subs`, `GET`/`PUT`/`PATCH`/`DELETE /api/subs/{id}`. Updates replace every field, so send the full subscription.

The full endpoint table with request details is in [AGENTS.md](AGENTS.md#api-endpoints).

Notes:
- Password reset and email-change links use random single-use tokens; only their SHA-256 hash is stored. Reset links expire after one hour, email-change links after 24 hours.
- Registration, password reset, contact, email confirmation, and password-checking account actions are rate limited.
- The contact form verifies the Turnstile token with Cloudflare server-side and sends the message to `CONTACT_RECIPIENT`, with the sender as Reply-To. Keep the Turnstile secret out of Vite variables.

## Scheduled commands

Two console commands keep billing data current and send payment reminders. Both are safe to run at any time and repeatedly, and both take `--dry-run` (show what would happen) and `--user=EMAIL` (one user only). Run them **hourly, in this order**:

```bash
docker compose exec backend php bin/console app:subscriptions:advance-billing-dates
docker compose exec backend php bin/console app:reminders:send
```

- `app:subscriptions:advance-billing-dates` moves a past `nextBillingDate` of an auto-renewing subscription to its next charge on or after the owner's local today, and turns a trial whose end date has passed into an active subscription. Cancelled, "other", deleted, and non-renewing subscriptions are left alone.
- `app:reminders:send` emails each user (with reminders on) a digest of upcoming payments, on the first run after 01:00 in their time zone; later runs that day skip them. No email goes out on a day with nothing new to remind, and a charge is reminded once, from its lead time until the charge day:

  | Reminder | Sent |
  |---|---|
  | Trial ending | 2 days before the trial ends |
  | Renewal, weekly | 1 day before |
  | Renewal, monthly | 3 days before |
  | Renewal, quarterly or yearly | 7 days before |

  It exits with a failure status when a digest can't be sent; that user is retried on the next run.

A third command removes expired rows from the PostgreSQL-backed cache pools (revoked JWTs and rate-limit counters, table `cache_items`). Expired rows are already ignored, so this only keeps the table small; run it hourly too, in any order:

```bash
docker compose exec backend php bin/console cache:pool:prune
```

Charge dates are counted from the stored date: monthly from 31 Jan gives 28 Feb, then 31 Mar (the calendar uses the same rule). Each user's time zone is set in Preferences and defaults to `Europe/Berlin` (Frankfurt, AWS eu-central-1). Servers and the database stay on UTC. Users turn reminders off in Preferences or with the one-click link in every reminder email.

## Frontend deployment

The frontend is a static build hosted on Cloudflare (Pages, or Workers with static assets) on the app's domain; the API and database run on AWS.

- Build command `npm run build`, output folder `frontend/dist`, Node 20. Set `VITE_API_URL` and `VITE_TURNSTILE_SITE_KEY` as build variables.
- The build writes `dist/_headers` (`frontend/build/securityHeaders.ts`): a Content Security Policy whose `connect-src` is the origin of `VITE_API_URL`, plus `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and long-lived caching for the hashed files in `/assets`. Add any new external script, frame, font, image, or API origin to that policy.
- SPA routing: Pages serves `index.html` for unknown paths when there's no `404.html`; on Workers set `not_found_handling = "single-page-application"`.
- `FRONTEND_URL` (backend) must be the app's one canonical origin: redirect `www` to it (or the reverse) with a Cloudflare redirect rule. Preview deployments (`*.pages.dev`) aren't allowed by the API's CORS.

### Client IPs behind proxies

Rate limits (registration, password reset, contact, email-change confirmation), login throttling, and the Turnstile check all use the client's IP. Behind a proxy PHP only sees the proxy's address, so without configuration every visitor shares one IP: a few sign-ups would block registration for everyone, and about 25 failed logins would lock everyone out.

Symfony reads the visitor's IP and scheme from `X-Forwarded-For` / `-Proto` / `-Port`, but only when the request comes from an address in `SYMFONY_TRUSTED_PROXIES` (`config/packages/framework.yaml`). It walks the `X-Forwarded-For` list from the right, skipping trusted proxies, so a header forged by the client is ignored. Unset, nothing is trusted (local development). Set it to every proxy hop in front of PHP, whatever the final setup is:

| Setup | `SYMFONY_TRUSTED_PROXIES` |
|---|---|
| Cloudflare (proxied DNS) → AWS load balancer → PHP | The VPC range of the load balancer (or `PRIVATE_SUBNETS`) plus Cloudflare's IP ranges ([cloudflare.com/ips](https://www.cloudflare.com/ips/)), comma-separated |
| Cloudflare Tunnel (`cloudflared` next to PHP) → PHP | The `cloudflared` address (or `PRIVATE_SUBNETS` if only it can reach PHP) |
| Cloudflare → PHP directly | Cloudflare's IP ranges |

Check after deploying: the client IP logged for a request (or a rate-limit hit from two networks) must differ per visitor, not be the proxy's address. Cloudflare's ranges change rarely; update the variable when they do.

Still to do when deploying:

1. Proxy the API hostname through Cloudflare with SSL mode Full (strict), allow only Cloudflare's IP ranges on the AWS load balancer, and add `X-Content-Type-Options: nosniff`, `Content-Security-Policy: frame-ancestors 'none'`, and `Cache-Control: no-store` to API responses with a Response Header Transform Rule.
2. Make sure the API can only be reached through your own Cloudflare zone. Cloudflare's IP ranges are shared by every Cloudflare customer, so an IP allow-list alone lets anyone route requests to the origin through their own zone or Worker and skip your WAF and edge rules. Prefer a Cloudflare Tunnel (`cloudflared` next to PHP, no public ingress on the load balancer); otherwise turn on Authenticated Origin Pulls with your own certificate (zone-specific mTLS, checked at the load balancer or nginx). Also add a WAF rule on the API hostname that blocks everything except `/api/*` and `/health`. (Cloudflare Access isn't a fit: it's a login gate for internal apps, not for a public API.)
3. The CSP ships as `Content-Security-Policy-Report-Only`. Click through the deployed app (sign-in, Turnstile on the contact page, calendar), fix what the browser console reports, then set `ENFORCE_CSP = true`.
4. Turn on HSTS in the Cloudflare dashboard (SSL/TLS > Edge Certificates) with a short `max-age` once the app and API both work over HTTPS; raise it, and consider `includeSubDomains`, once it's stable.

## Repository layout

```text
backend/   Symfony API, console commands, Doctrine migrations, and PHPUnit tests
frontend/  React application, calendar UI, and Vitest tests
```

Coding and security conventions for contributors (and AI agents) are in [AGENTS.md](AGENTS.md).

## Payments

The paid plan is a **one-time unlock: €19.99, VAT included, no renewal**. It lifts the free plan's limit of 50 active (active or trial) subscriptions. Payment runs on Stripe-hosted Checkout, so card details never reach ValuTir.

How it works:

1. `POST /api/billing/checkout` (signed in) creates a Checkout session. The product, amount, currency, and buyer all come from the server (`App\Payment\UnlockOffer`); the request has no body. Any earlier open session of the same user is expired first, so only one can be paid. A `purchase` row records the session (status `pending`). Rate limit: 10 attempts per hour per user.
2. The browser goes to the returned URL. The frontend only follows URLs on `https://checkout.stripe.com`.
3. Stripe calls `POST /api/billing/webhook`. The request must carry a valid `Stripe-Signature` (an HMAC of the raw body under `STRIPE_WEBHOOK_SECRET`, at most 5 minutes old), or it gets a 400. Only this webhook unlocks an account, and only for a session the server created whose mode, amount, currency, product, and buyer match the `purchase` row. Being redirected back to `/plans?checkout=success` proves nothing; the page polls `GET /api/billing` until the webhook has landed.
4. Handled events: `checkout.session.completed`, `checkout.session.async_payment_succeeded` / `_failed`, `checkout.session.expired`, `charge.refunded` (a full refund revokes the unlock; a partial one keeps it), and `charge.dispute.created` (revokes it). Events are applied idempotently on a locked row, in any order and any number of times; other event types get a 200 and are ignored.
5. The free limit is enforced in `App\Payment\FreePlanLimit`. Creating a 51st active subscription, or re-activating a cancelled one at the limit, returns 402; existing records stay readable and editable. The count runs with the user's row locked, so parallel requests can't pass it.

Tax: with `STRIPE_AUTOMATIC_TAX=1` Checkout uses Stripe Tax on the tax-inclusive price, requires a billing address (VAT location evidence), and accepts a VAT ID (EU business reverse charge). Before going live, set up Stripe Tax in the Dashboard: your origin address, the registrations you hold (e.g. Romania, plus EU OSS once you're over the threshold), and a default product tax code for SaaS. Check the setup with your accountant.

### Testing payments locally

Use **test-mode keys only** (`sk_test_…`); test mode never moves money.

1. In the Stripe Dashboard (test mode), copy the secret key from Developers → API keys. Put it in `backend/.env` as `STRIPE_SECRET_KEY`. Turn on Stripe Tax in test mode, or set `STRIPE_AUTOMATIC_TAX=0`.
2. Get the local webhook signing secret and put it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`. It stays the same for your key, so you only do this once:

   ```bash
   docker compose --profile stripe run --rm stripe-cli listen --print-secret
   ```

3. Recreate the backend so it picks up the variables, apply the migrations, and start the webhook forwarder:

   ```bash
   docker compose up -d backend
   docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
   docker compose --profile stripe up -d stripe-cli
   docker compose logs -f stripe-cli    # shows every forwarded event and the backend's response code
   ```

   Without Docker, `stripe login` then `stripe listen --forward-to localhost:8080/api/billing/webhook` with the Stripe CLI works the same.
4. Sign in at `http://localhost:5173`, open **Plans**, and pay. Test cards (any future expiry, any CVC, any postcode):

   | Card | Result |
   |---|---|
   | `4242 4242 4242 4242` | Paid: the page confirms and the account is unlocked |
   | `4000 0025 0000 3155` | 3-D Secure challenge, then paid |
   | `4000 0000 0000 9995` | Declined (insufficient funds): stays on the free plan |

   With SEPA Direct Debit enabled in test mode, the test IBAN `DE89370400440532013000` succeeds after a short delay (the `async_payment_succeeded` path).
5. Refund or dispute: refund the payment in the Dashboard (Payments → the payment → Refund), and the account goes back to the free plan. For a dispute, pay with `4000 0000 0000 0259`.
6. Check the result: `GET /api/billing` returns `"unlocked": true`, and the `purchase` row has status `paid`. `stripe trigger checkout.session.completed` creates sessions the server didn't make, so they're logged as unknown and ignored, which is expected.

### Going live

- Create a webhook endpoint in the Dashboard (live mode) for `https://<api-host>/api/billing/webhook` with exactly the six events above. Set its signing secret as `STRIPE_WEBHOOK_SECRET` and a **restricted key** as `STRIPE_SECRET_KEY`, both as deployment secrets, never in git. The restricted key needs Checkout Sessions write access, plus Customers write access when Stripe Tax is on.
- Activate the account, finish Stripe Tax, and enable the payment methods you want (Checkout shows the ones turned on in the Dashboard).
- A webhook that fails returns 500, and Stripe retries it for up to three days. Alarm on repeated "Rejected Stripe webhook." or "Stripe session does not match its purchase" log lines.

Ideas for the paid plan:

- **Custom reminder lead times.** Reminder timing is fixed for now (table above). Letting users choose when they're reminded, globally or per subscription, is a candidate paid-plan feature.

## Brainstorming

### Product and data ideas

- Support manual entries first, then consider receipt/email import or bank-transaction sync with recurring-payment detection.
- Enrich a subscription with provider grouping, source, confidence, merchant name, and a user-confirmed usage signal.
- Present savings suggestions as estimates: potential duplicate services, a known cheaper annual option, or subscriptions the user has not recently confirmed as useful.

### Calendar roadmap

- Add week, day, and agenda views.
- Add an upcoming 30/60/90-day timeline with service, amount, currency, category, and status.
- Polish empty/loading states, status-colored event chips, mobile layouts, and selected-day details.

## Status & TODO

Fixed items are removed from this list; the git history records what changed. Items marked **Later** are planned but deliberately deferred.

### Correctness and reliability

1. **Later: tests don't cover the rules that matter most.** Decided for now: backend tests stay database-free. There are 166 backend and 69 frontend tests, but no backend test reaches a database. User isolation on subscriptions (user B can't read or change user A's), the subscription create/update/delete flow over HTTP, token revocation through the firewall, and the reminder commands' database queries (claiming a user's day, the reminder log) are untested against a real database. Several service tests are mock-heavy and assert implementation details.
   - Plan: a base test case on a real test database (`valutir_test`, tables truncated per test), and a few HTTP and command scenario tests replacing most mock tests.
   - CI: the CI env file points `DATABASE_URL` at host `db`, which the GitHub Actions Postgres service doesn't provide (it needs `127.0.0.1` and a published port), and the workflow never generates JWT keys. Both block database tests in CI.
2. **Later: run the scheduled commands and send email on AWS.** Payment reminders are built (see Scheduled commands) but nothing schedules them in production yet:
   - Schedule the commands hourly (`advance-billing-dates` before `reminders:send`, plus `cache:pool:prune`), for example EventBridge Scheduler starting the backend image as an ECS task with each command, and alarm in CloudWatch when a run fails.
   - Send email through Amazon SES with the existing Mailer SMTP transport (`MAILER_DSN=smtp://…@email-smtp.eu-central-1.amazonaws.com:587`), after verifying the sending domain (SPF, DKIM, DMARC) and requesting production access out of the SES sandbox.
   - Set `DEFAULT_URI` to the API's public URL (the one-click unsubscribe header is built from it) and `FRONTEND_URL` to the app's origin (links in the email, and CORS).
   - Later: handle SES bounces and complaints (SNS) by turning reminders off for those addresses.
3. **The "Other" status is undefined.** The subscription form shows users a warning ending in "(TODO)": *"Other" is treated as partially active in the current flow.* Whether an "Other" subscription is charged, reminded, or counted in totals has never been decided; the reminder and billing-date commands currently skip it. Decide what it means, or remove it.
4. **Small date rules still open:** "Re-enabled from" on the re-enable form has no limits, and a provider cancellation date can be earlier than the subscription's start date.

### Security and operations

5. **A JWT passphrase was committed.** It's in the backend CI env file and was in `backend/.env.sample` (now a placeholder) and remains in git history. Treat it as exposed: rotate it if it protects anything real, and move CI secrets to GitHub Actions secrets.
6. **Dependency audit.** `npm` reported 28 known vulnerabilities (19 moderate, 9 high), and `composer audit` hasn't been run (AGENTS.md asks for it before releases). Apply safe updates and list anything that needs a major upgrade.
7. **The dev admin command hard-codes a password** and prints it to the console (`app:create-admin`). Read it from a prompt or option instead.
8. **No email verification for new accounts.** Anyone can register with an address they don't own; the account works without confirming it. (Emails are case-insensitive: stored lowercase, enforced by migration `Version20261102200300`.)
9. **Rate limiters run without a lock.** Counters live in PostgreSQL (`cache.rate_limiter`), but `symfony/lock` isn't installed, so parallel requests can read the same count and exceed a limit (e.g. more than 5 password guesses). Add `symfony/lock` with the PostgreSQL advisory-lock store (`PostgreSqlStore`, no table needed).
10. **Optional hardening: keep the JWT in an HttpOnly cookie.** The SPA stores it in `localStorage` (`valutir_auth_token`), so a successful XSS could steal it for later use. The CSP and React's escaping make that unlikely, and an XSS could still call the API while the page is open, so the gain is limited. If done: the API sets an `HttpOnly; Secure; SameSite=Strict` cookie (Lexik supports cookie tokens). The app and API hostnames count as the same site, so no Worker or single origin is needed. The SPA sends `credentials: 'include'`, CORS allows credentials for `FRONTEND_URL`, and logout clears the cookie. Add CSRF protection (AGENTS.md requires it for cookie auth): an `Origin` check on state-changing requests, because sibling subdomains count as same-site. Keep the 24-hour lifetime (or about 8 hours); skip refresh tokens, since the blocklist and `tokenVersion` already revoke tokens server-side.
11. **Lowest priority: purge old soft-deleted subscriptions.** Add an `app:subscriptions:purge-deleted` command, run by cron, that archives or removes subscriptions soft-deleted longer than a retention period.

### Product gaps and mocks

12. **Most paid-plan tools aren't built yet.** The one-time unlock is paid through Stripe and lifts the 50-subscription limit. The Plans page also lists project and cost-center allocation, a bookkeeping export, custom reminder timing, and price history, and none of them exist yet. Build them, or take them off the page before charging real customers. Also missing: no receipt or invoice email from ValuTir (Stripe can send receipts: Dashboard → Settings → Emails), and no USD or RON prices, since everyone is charged in EUR.
13. **The Business view is only a filter** on the `b2b` flag (no business account or team).
14. **No account data export** before deletion.
15. **Later: who pays a shared bill.** Household sharing assumes you pay the full bill and others owe you their share. If someone else pays, the charge isn't on your card but you owe your share; that needs a "payer" field, calendar charges that follow it, and settle-up reminders.
16. **Later: family-plan savings.** Suggest a family plan when several people pay for the same service separately (fits the savings-suggestions roadmap; needs named household members or real household accounts).
17. **Later: real household accounts.** Invite members by email so one shared subscription is visible to everyone, each seeing their own share. This changes the rule that subscriptions are visible only to their owner, so it needs its own access-rule design and tests.
