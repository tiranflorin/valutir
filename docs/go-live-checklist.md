# Go-live checklist

What to check and fix before ValuTir takes real payments, plus what Stripe needs from the production architecture, as input for the final system design. Details live in [payments.md](payments.md), [cloudflare-and-proxies.md](cloudflare-and-proxies.md), and [architecture.md](architecture.md); "TODO #N" refers to [status-and-todo.md](status-and-todo.md). This page is the one list to tick off.

Status on 2026-11-03: payments, email verification, branded emails, and the legal pages are built and covered by unit tests and local runs. A full payment through a Stripe sandbox (pay, unlock, refund) hasn't been run yet; that's the first Stripe item below. Nothing here has been done for production yet.

## Part 1: check and fix before production

### Blockers: code and content

- [x] **Fix the npm audit findings and check React Router 7:** every high finding cleared on 2026-11-05, and the app was clicked through on React Router 7 on 2026-11-06. The 7 moderate findings left are all one advisory in the development-only lint tooling (typescript-eslint's `minimatch` 10), not exploitable; they clear when typescript-eslint moves to minimatch 11 (don't force it with an npm override).
- [ ] **Re-run `npm audit` and `composer audit` right before release.**
- [x] **Retire the committed JWT passphrase:** removed from the CI env file and the sample, and local keys regenerated on 2026-11-06. It never protected a committed key, and the git history is left as is (the repository is public, so rewriting it wouldn't un-expose anything).
- [ ] **Match the Plans page to what's built.** Only lifting the 50-subscription limit exists today; the page also promises project/cost-center allocation, a bookkeeping export, custom reminder timing, and price history (TODO #7). Build them, or take them off the page, before charging anyone.
- [ ] **Honor the 14-day money-back guarantee** promised in the Terms and Refund policy (instead of asking buyers to waive the EU withdrawal right at checkout). Refund requests arrive through the contact form; issue them in the Stripe Dashboard within 5 business days. A full refund returns the account to the free plan automatically.
- [x] **Finish the legal pages:** Privacy (`/privacy`), Terms (`/terms`), and Refunds (`/refunds`), all linked in the footer and from the Plans page. Have all three reviewed by a lawyer. The Privacy policy already includes the cookies and storage table (TODO #5).
- [ ] **Make the Privacy Policy's promises true in production:** error logs kept for at most 30 days (set CloudWatch log-group retention to 30 days), contact messages deleted from the `CONTACT_RECIPIENT` mailbox once handled, and data processing agreements in place with AWS, Cloudflare and Stripe.
- [ ] **Add the Terms and Refunds URLs in the Stripe Dashboard** (Settings → Public details), and set the support email and the `VALUTIR` statement descriptor that the Refund policy names.
- [ ] **A process for GDPR access and portability requests.** The Privacy policy promises an answer within one month, but there's no self-service export (TODO #9). Until there is, export the user's account, subscriptions, and purchases from the database by hand, as JSON or CSV.
- [x] **Add locking to the rate limiters:** done on 2026-11-06. Every limiter and login throttling takes a PostgreSQL advisory lock (`symfony/lock`, `DoctrineDbalPostgreSqlStore` on the app's own connection), so parallel requests can't go past a limit. Locally, 20 parallel sign-ups passed a limit of 5 before the change and exactly 5 after.

### Should fix

- [ ] **Database-backed tests** for user isolation, the checkout and webhook flow, and token revocation (TODO #1, currently deferred).

### Stripe account (live mode)

- [ ] **Run one full payment in the Stripe sandbox first** ([payments.md, "Testing payments locally"](payments.md#testing-payments-locally)): pay with `4242 4242 4242 4242`, see the account unlock, refund it in the Dashboard, and see it return to the free plan.
- [ ] 2FA on every Dashboard login (security key or authenticator app). Team members get their own logins with the smallest role that works.
- [ ] Activate the account for **TECHDIVISION SRL** (Romania), with its Trade Register number and CUI (the CUI matches the legal pages). Use a payout bank account in **EUR**, matching the charge currency, if Stripe offers it.
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

- [ ] Run migrations before the new code serves traffic: `cache_items`, `purchase` and `user.unlocked_at`, and the email verification columns on `user`. Existing accounts start unverified.
- [ ] API routed through the Cloudflare Tunnel, and the EC2 security group has no inbound rules, so the origin is reachable only through your own zone. Zone SSL mode Full (strict).
- [ ] WAF rule: only `/api/*` and `/health` on the API hostname.
- [ ] **WAF skip rule for `/api/billing/webhook`:** no Bot Fight Mode, managed challenge, "Under Attack" mode, or tight rate limit on it. Optionally allow only [Stripe's webhook IPs](https://docs.stripe.com/ips) there.
- [ ] `SYMFONY_TRUSTED_PROXIES` set to the Compose network subnet where `cloudflared` runs ([cloudflare-and-proxies.md](cloudflare-and-proxies.md#client-ips-behind-proxies)); check that the logged client IP differs per visitor.
- [ ] **Production JWT keys:** generate a new key pair with a new passphrase for production only (`openssl rand -hex 32`, then `lexik:jwt:generate-keypair`), store both keys and the passphrase as SecureStrings under `/valutir/prod/`, and never reuse a development or CI value. They never go into git or the image ([architecture.md, Settings and secrets](architecture.md#production-image)). The key and passphrase only work as a pair: to rotate the passphrase, generate and store a new key pair at the same time, or signing in fails with a 500.
- [ ] `FRONTEND_URL` is the app's HTTPS origin (Stripe returns buyers to `FRONTEND_URL/plans`), and `DEFAULT_URI` is the API's public URL.
- [ ] Hourly scheduled commands through the systemd timer on the instance: `app:subscriptions:advance-billing-dates`, `app:reminders:send`, `cache:pool:prune`, with alarms on failure (TODO #2).
- [ ] Email via Amazon SES, with the domain verified (SPF, DKIM, DMARC) and production access granted (TODO #2).
- [ ] The email logo is served at `FRONTEND_URL/brand/email-logo.png` (it's deployed with the frontend). Send yourself each email once from production and check it in Gmail and Outlook.
- [ ] CSP switched from report-only to enforced after a click-through, and HSTS turned on in Cloudflare ([cloudflare-and-proxies.md](cloudflare-and-proxies.md)).
- [ ] Log alerts on `Rejected Stripe webhook.`, `Stripe session does not match its purchase`, and `Stripe Checkout is turned off.`; Stripe's own "failing endpoint" emails go to a monitored inbox.

## Part 2: Stripe requirements for the final architecture

Whatever the final AWS and Cloudflare layout is, it has to provide these:

| # | Requirement | Why | Notes |
|---|---|---|---|
| 1 | **Inbound:** `POST https://<api-host>/api/billing/webhook` is reachable from the public internet over HTTPS (a valid certificate, no plain HTTP in live mode) | Stripe calls it directly; only the webhook unlocks or revokes accounts | Must not sit behind Cloudflare Access, a login, an interactive challenge, or bot protection. Stripe sends events in bursts, and retries come in bursts after an outage |
| 2 | **Raw request body passed through unchanged** | The signature is an HMAC over the exact bytes | No body transforms, re-encoding, or JSON re-serialization by any proxy, gateway, or Lambda adapter in between |
| 3 | **Fast 2xx** | Stripe treats slow responses as failures and retries | Today's handler is one small database transaction. Keep it synchronous only while it stays that small; anything slow (emails, exports) goes to a queue |
| 4 | **Outbound:** HTTPS from the backend to `api.stripe.com:443` | Creating and expiring Checkout sessions | The EC2 instance uses its public IPv4 address for outbound traffic only, so no NAT gateway is needed. If egress is ever allow-listed, add `api.stripe.com` (and SES and Turnstile, which the app also calls) |
| 5 | **One shared PostgreSQL for all backend instances** | Purchases, `FOR UPDATE` row locks (one webhook delivery applied at a time, the 50-limit count), rate-limit counters, and the JWT blocklist (`cache_items`) | No per-instance state. One container today; more containers or instances work as long as they share the database |
| 6 | **Secrets per environment in a secret store** (AWS Secrets Manager or SSM Parameter Store) | Key separation; `StripeKeyPolicy` refuses live keys outside `STRIPE_MODE=live` with `APP_ENV=prod` | Production: live restricted key plus the live endpoint's secret. Staging: sandbox key, `STRIPE_MODE=test`, and its own test endpoint. Plan for rotation |
| 7 | **Accurate server clock** (NTP) | Webhook signatures older than 5 minutes are rejected | AWS time sync is on by default; don't turn it off |
| 8 | **A tolerable downtime window** | Stripe retries failed deliveries for up to 3 days, so brief outages delay unlocks but lose nothing | Deploys: migrations first, then code. Keep the webhook route stable across releases |
| 9 | **Logs kept and alerted on, without webhook bodies** | Investigating disputes and suspicious events | Webhook bodies hold buyer PII and are redacted by `ApiExceptionSubscriber`; keep any extra logging layer (Cloudflare logs, WAF, APM) from capturing request bodies on this path |
| 10 | **Frontend stays Stripe-free** | Hosted Checkout is a top-level redirect to `checkout.stripe.com`; no Stripe.js and no publishable key | The CSP needs no Stripe origins today. Switching to embedded Checkout or Stripe Elements would need `js.stripe.com` and related origins added to `frontend/build/securityHeaders.ts` |
| 11 | **Staging mirrors production on test keys** | Demos and QA can't charge anyone | Same architecture, a sandbox account key, and its own webhook endpoint pointing at the staging API |
