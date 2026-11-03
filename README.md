# ValuTir

Your subscription tracker. Keep every subscription in one place, see what they really cost you each month and year, and get an email before each payment, so a renewal or the end of a free trial never takes you by surprise.

It's a web app (React) with a JSON API (Symfony). Status: an MVP, built and tested locally, and being prepared for its first deployment at **https://valutir.app**. Nothing is live yet.

## What it does

**Tracking**
- Add subscriptions with price, currency, billing cycle (weekly, monthly, quarterly, yearly), category, payment method, trial end date, notes, and auto-renewal.
- Personal and Business views, each with cost and count totals, a "Needs attention" list of trials and renewals, and filters and sorting.
- Household sharing: split a bill equally between 2–10 people and see your own share.
- A calendar of upcoming charges, with a page per day.
- Cancel, re-enable, or delete subscriptions; cancelled ones stay in their own section.

**Reminders**
- At most one email a day, only when a payment needs attention (a trial ending or a renewal coming up), sent early in the day in your time zone (after 01:00). One-click unsubscribe in every email.

**Account**
- Sign up with email confirmation, sign in, password reset, change email or password, sign out everywhere, and delete the account with all its data.
- Preferences: default currency (EUR, USD, RON), time zone, and reminders on or off.
- Light and dark theme.

## Plans and pricing

- **Free:** everything above, for up to 50 active subscriptions (active or in trial).
- **One-time unlock: €19.99, VAT included, no renewal.** It lifts the 50-subscription limit. Payment runs on Stripe's hosted checkout, so ValuTir never sees card details. Everyone is charged in EUR.
- **14-day money-back guarantee:** a full refund on request, no questions asked.
- Some advanced business tools listed on the Plans page (project and cost-center allocation, a bookkeeping export, custom reminder timing, price history) aren't built yet and aren't part of the purchase until they ship.

The app includes a Privacy policy, Terms of use, and Refund policy, operated by TechDivision (TECHDIVISION SRL, Oradea, Romania). No ads, tracking, or analytics, and no cookie banner, because everything stored is strictly necessary.

## Product ideas

- **Paid plan:** custom reminder lead times, globally or per subscription (reminder timing is fixed today).
- **Data:** start with manual entries, then consider importing from receipts or email, or bank-transaction sync with recurring-payment detection.
- **Enrichment:** group by provider, record source and merchant name, and ask users to confirm a subscription is still useful.
- **Savings suggestions** (as estimates): likely duplicate services, a known cheaper annual option, or subscriptions not confirmed as useful recently.
- **Calendar:** week, day, and agenda views; a 30/60/90-day timeline with service, amount, currency, category, and status; better empty and loading states, status-colored events, and mobile layouts.

## Quick start

Requires Docker. Create `backend/.env` from `backend/.env.sample` and `frontend/.env` from `frontend/.env.dist`, then:

```bash
docker compose up -d --build
docker compose exec backend php bin/console lexik:jwt:generate-keypair --skip-if-exists
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

The app runs at http://localhost:5173, the API at http://localhost:8080, and sent emails show up in MailDev at http://localhost:1080. Details: [docs/development.md](docs/development.md).

## Stack

Symfony 7.4 on PHP 8.3, served by FrankenPHP; Doctrine with PostgreSQL 16; JWT authentication; Stripe Checkout; Twig email templates. React 18 with TypeScript, Vite, MUI, and FullCalendar. Hosting: Cloudflare (frontend, DNS, protection) and AWS Frankfurt (API, database, email).

## Documentation

| Topic | File |
|---|---|
| Running, testing, and configuring locally | [docs/development.md](docs/development.md) |
| API endpoints | [docs/api.md](docs/api.md) (full table in [AGENTS.md](AGENTS.md#api-endpoints)) |
| Payment reminders and other scheduled commands | [docs/scheduled-commands.md](docs/scheduled-commands.md) |
| Emails and their shared template | [docs/emails.md](docs/emails.md) |
| Payments and Stripe (testing, keys, going live) | [docs/payments.md](docs/payments.md) |
| Cloudflare hosting, security headers, and client IPs behind proxies | [docs/cloudflare-and-proxies.md](docs/cloudflare-and-proxies.md) |
| Deployment architecture and decisions | [docs/architecture.md](docs/architecture.md) |
| What must be done before going live | [docs/go-live-checklist.md](docs/go-live-checklist.md) |
| Known issues and TODO list | [docs/status-and-todo.md](docs/status-and-todo.md) |
| Coding and security rules (for contributors and AI agents) | [AGENTS.md](AGENTS.md) |
