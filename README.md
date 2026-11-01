# ValuTir

ValuTir is a subscription tracker with a Symfony JSON API and a React single-page application. Track subscriptions, their billing cycles, and upcoming renewal dates in a calendar.

## Stack

- Symfony 7.4, PHP 8.3, Doctrine ORM, PostgreSQL 16, JWT authentication, and Symfony HttpClient for server-side Turnstile verification
- React 18, TypeScript, Vite, MUI, and FullCalendar
- Docker Compose for local development, with MailDev for local email inspection

## Current capabilities

- Account registration and JWT login
- User-scoped subscription create, read, update, and soft-delete operations
- Subscription fields for amount, currency, cadence, category, payment method, status, dates, notes, trial details, and a `b2b` business classification
- Personal and business dashboard views, with a business toggle on subscription create and edit forms
- Protected Profile and Preferences pages, including authenticated password changes and a saved default currency for new subscriptions
- Calendar month view with recurring events and filters, plus a selected-day page for scheduled payments with a direct return to the highlighted calendar date
- Plans page describing free tracking and the proposed one-time unlock; the upgrade action is a mock and does not start checkout
- Contact page with server-verified Cloudflare Turnstile, a honeypot, and email delivery

The dashboard defaults to Personal. Creating a subscription from the Business view preselects the business classification; editing keeps a saved business classification, and the Business view also preselects it for the edit form.

## Local development

Prerequisites: Docker Desktop (or Docker Engine with Compose). The backend requires local environment values for the database password and JWT passphrase, plus JWT key files; keep these values and keys out of version control.

```bash
docker compose up -d --build
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

# Backend tests
docker compose exec backend php vendor/bin/phpunit

# Frontend checks
docker compose run --rm frontend-test npm run test:run
docker compose run --rm frontend-test npm run type-check
docker compose run --rm frontend-test npm run lint
docker compose run --rm frontend-test npm run build
```

## API

Public endpoints:

- `POST /api/register`
- `POST /api/login_check`
- `POST /api/contact`

Password reset uses a random, single-use token whose SHA-256 hash is stored for one hour. A successful reset updates the password through Symfony's password hasher and consumes the token. Requests are rate limited by client IP. Set `FRONTEND_URL` in deployed environments so reset emails link to the correct frontend; it defaults to `http://localhost:5173` for local development. Apply the new Doctrine migration before using the flow. Symfony's RateLimiter component backs reset and login throttling.

Authenticated account endpoint:

- `PATCH /api/profile/password`

Authenticated subscription endpoints:

- `GET`, `POST /api/subs`
- `GET`, `PUT`, `PATCH`, `DELETE /api/subs/{id}`

The Profile and Preferences pages are available from the account menu at `/profile` and `/preferences`. The default currency is stored in the current browser for the signed-in email and preselected on new subscriptions. Existing subscription amounts remain in their recorded currencies.

The plans page is available at `/plans` to signed-in and signed-out visitors. Its one-time upgrade button only shows an informational message; payment and Stripe checkout are not connected.

The contact form is available at `/contact`. It posts the email, message, honeypot, and Turnstile token to `POST /api/contact`; Symfony verifies the token with Cloudflare Siteverify and rate-limits submissions. The backend's Symfony HttpClient dependency is installed with the normal Composer install and makes the Siteverify request. Set `VITE_TURNSTILE_SITE_KEY` for the frontend and `TURNSTILE_SECRET_KEY` in the backend environment. Optionally set `TURNSTILE_ALLOWED_HOSTNAMES` to a comma-separated hostname allowlist; when set, the hostname returned by Cloudflare must match. Set `CONTACT_RECIPIENT` in the backend environment to the mailbox that should receive contact messages. Delivery uses the configured `MAILER_DSN`; the sender is `noreply@valutir.com` and the submitter's address is set as Reply-To. Keep the Turnstile secret out of Vite variables.

Use an `Authorization: Bearer <token>` header for authenticated requests. `GET /health` is available for service health checks.

## Repository layout

```text
backend/   Symfony API, Doctrine migrations, and PHPUnit tests
frontend/  React application, calendar UI, and Vitest tests
```

## Brainstorming

### Product and data ideas

- Support manual entries first, then consider receipt/email import or bank-transaction sync with recurring-payment detection.
- Enrich a subscription with provider grouping, source, confidence, merchant name, shared-household flag, and a user-confirmed usage signal.
- Normalize weekly, monthly, quarterly, and yearly prices into monthly and annual totals.
- Present savings suggestions as estimates: potential duplicate services, a known cheaper annual option, or subscriptions the user has not recently confirmed as useful.

### Calendar roadmap

- Add month, week, day, and agenda views.
- Add an upcoming 30/60/90-day timeline with service, amount, currency, category, and status.
- Polish empty/loading states, status-colored event chips, mobile layouts, and selected-day details.

### Engineering ideas

- Expand test coverage.
- Update the CI workflows for backend tests and frontend checks.
