# Go-live checklist

What to check and fix before ValuTir takes real payments, plus what Stripe needs from the production architecture, as input for the final system design. Details live in the [README](../README.md) ("Payments", "Frontend deployment", "Status & TODO"); this page is the one list to tick off.

Status on 2026-11-03: payments run end to end in a Stripe sandbox; nothing below has been done for production yet.

## Part 1: check and fix before production

### Blockers: code and content

- [ ] **Fix the npm audit findings** (28 known vulnerabilities: 19 moderate, 9 high), and re-run `composer audit` right before release (README TODO #6).
- [ ] **Rotate the committed JWT passphrase**, and move CI secrets to GitHub Actions secrets (TODO #5).
- [ ] **Remove the hard-coded dev admin password** from `app:create-admin` (TODO #7).
- [ ] **Match the Plans page to what's built.** Only lifting the 50-subscription limit exists today; the page also promises project/cost-center allocation, a bookkeeping export, custom reminder timing, and price history (TODO #11). Build them, or take them off the page, before charging anyone.
- [ ] **EU right of withdrawal.** Before paying, the buyer must explicitly agree to immediate delivery and acknowledge that this ends the 14-day withdrawal right; otherwise they can claim a full refund within 14 days. Add a required terms checkbox and custom text to the Checkout session (`consent_collection`, `custom_text`).
- [ ] **Legal pages:** Terms, Privacy Policy (name Stripe as payment processor), refund policy, and contact details, linked from the site footer and Plans page. Stripe reviews these during activation. Have a lawyer review them.
- [ ] **Add locking to the rate limiters** (`symfony/lock` with `PostgreSqlStore`), so parallel requests can't go past a limit (TODO #8).

### Should fix

- [ ] **Database-backed tests** for user isolation, the checkout and webhook flow, and token revocation (TODO #1, currently deferred).

### Stripe account (live mode)

- [ ] 2FA on every Dashboard login (security key or authenticator app). Team members get their own logins with the smallest role that works.
- [ ] Business type and country decided with the accountant (e.g. SRL or PFA) before activation; payout bank account in **EUR**, to match the charge currency, if offered.
- [ ] Industry: **Software as a service (SaaS)**, with an accurate product description (subscription tracker, free plan, optional one-time €19.99 unlock, delivered digitally and immediately).
- [ ] Statement descriptor `VALUTIR` (or `VALUTIR.COM`), so buyers recognize the charge.
- [ ] Public details: support email, website, phone. Branding: name, logo, color.
- [ ] Settings → Customer emails: receipts for successful payments and refunds turned **on** (ValuTir sends none itself).
- [ ] Payment methods: cards only to start. Delayed methods such as SEPA Direct Debit work, but the unlock waits until the money clears. Leave Radar and 3-D Secure at their defaults.
- [ ] Stripe Tax: origin address, the registrations actually held (none if you're not VAT-registered yet; EU OSS once you're over the threshold; watch US state thresholds), default tax code **SaaS – personal use** (`txcd_10103000`). Confirm with the accountant. Or deploy with `STRIPE_AUTOMATIC_TAX=0` until that's decided.
- [ ] Live webhook endpoint for `https://<api-host>/api/billing/webhook` with **exactly** these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
- [ ] **Restricted** live key (`rk_live_…`) with Checkout Sessions write access, plus Customers write while Stripe Tax is on. No full `sk_live_` key on servers.
- [ ] Deployment secrets: `STRIPE_MODE=live`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` (that endpoint's own `whsec_…`). Never in git, images, or logs.
- [ ] "Send test event" on the endpoint returns **200**: it is logged as an unknown session and acknowledged. 400 means the wrong signing secret; a timeout or 5xx means something in front of the API is blocking Stripe.
- [ ] Optional smoke test after launch: one real payment and a refund (Stripe keeps its processing fee).

### Infrastructure and deploy

- [ ] Run migrations before the new code serves traffic (`purchase`, `user.unlocked_at`, `cache_items`).
- [ ] API proxied through Cloudflare with SSL Full (strict). Origin reachable only through your own zone: Cloudflare Tunnel, or Authenticated Origin Pulls with your own certificate.
- [ ] WAF rule: only `/api/*` and `/health` on the API hostname.
- [ ] **WAF skip rule for `/api/billing/webhook`:** no Bot Fight Mode, managed challenge, "Under Attack" mode, or tight rate limit on it. Optionally allow only [Stripe's webhook IPs](https://docs.stripe.com/ips) there.
- [ ] `SYMFONY_TRUSTED_PROXIES` set for the real proxy chain; check that the logged client IP differs per visitor.
- [ ] `FRONTEND_URL` is the app's HTTPS origin (Stripe returns buyers to `FRONTEND_URL/plans`), and `DEFAULT_URI` is the API's public URL.
- [ ] Hourly scheduled commands: `app:subscriptions:advance-billing-dates`, `app:reminders:send`, `cache:pool:prune`, with alarms on failure (TODO #2).
- [ ] Email via Amazon SES, with the domain verified (SPF, DKIM, DMARC) and production access granted (TODO #2).
- [ ] CSP switched from report-only to enforced after a click-through, and HSTS turned on in Cloudflare (README "Frontend deployment").
- [ ] Log alerts on `Rejected Stripe webhook.`, `Stripe session does not match its purchase`, and `Stripe Checkout is turned off.`; Stripe's own "failing endpoint" emails go to a monitored inbox.

## Part 2: Stripe requirements for the final architecture

Whatever the final AWS and Cloudflare layout is, it has to provide these:

| # | Requirement | Why | Notes |
|---|---|---|---|
| 1 | **Inbound:** `POST https://<api-host>/api/billing/webhook` is reachable from the public internet over HTTPS (a valid certificate, no plain HTTP in live mode) | Stripe calls it directly; only the webhook unlocks or revokes accounts | Must not sit behind Cloudflare Access, a login, an interactive challenge, or bot protection. Stripe sends events in bursts, and retries come in bursts after an outage |
| 2 | **Raw request body passed through unchanged** | The signature is an HMAC over the exact bytes | No body transforms, re-encoding, or JSON re-serialization by any proxy, gateway, or Lambda adapter in between |
| 3 | **Fast 2xx** | Stripe treats slow responses as failures and retries | Today's handler is one small database transaction. Keep it synchronous only while it stays that small; anything slow (emails, exports) goes to a queue |
| 4 | **Outbound:** HTTPS from the backend to `api.stripe.com:443` | Creating and expiring Checkout sessions | In private subnets, this needs a NAT gateway or an egress proxy. If egress is allow-listed, add `api.stripe.com` (and SES and Turnstile, which the app also calls) |
| 5 | **One shared PostgreSQL for all backend instances** | Purchases, `FOR UPDATE` row locks (one webhook delivery applied at a time, the 50-limit count), rate-limit counters, and the JWT blocklist (`cache_items`) | No per-instance state. Any number of containers and ECS tasks works as long as they share the database |
| 6 | **Secrets per environment in a secret store** (AWS Secrets Manager or SSM Parameter Store) | Key separation; `StripeKeyPolicy` refuses live keys outside `STRIPE_MODE=live` with `APP_ENV=prod` | Production: live restricted key plus the live endpoint's secret. Staging: sandbox key, `STRIPE_MODE=test`, and its own test endpoint. Plan for rotation |
| 7 | **Accurate server clock** (NTP) | Webhook signatures older than 5 minutes are rejected | AWS time sync is on by default; don't turn it off |
| 8 | **A tolerable downtime window** | Stripe retries failed deliveries for up to 3 days, so brief outages delay unlocks but lose nothing | Deploys: migrations first, then code. Keep the webhook route stable across releases |
| 9 | **Logs kept and alerted on, without webhook bodies** | Investigating disputes and suspicious events | Webhook bodies hold buyer PII and are redacted by `ApiExceptionSubscriber`; keep any extra logging layer (load balancer, WAF, APM) from capturing request bodies on this path |
| 10 | **Frontend stays Stripe-free** | Hosted Checkout is a top-level redirect to `checkout.stripe.com`; no Stripe.js and no publishable key | The CSP needs no Stripe origins today. Switching to embedded Checkout or Stripe Elements would need `js.stripe.com` and related origins added to `frontend/build/securityHeaders.ts` |
| 11 | **Staging mirrors production on test keys** | Demos and QA can't charge anyone | Same architecture, a sandbox account key, and its own webhook endpoint pointing at the staging API |
