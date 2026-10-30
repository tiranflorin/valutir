# ValuTir

ValuTir is a subscription tracker with a Symfony JSON API and a React single-page application. Track subscriptions, their billing cycles, and upcoming renewal dates in a calendar.

## Stack

- Symfony 7.4, PHP 8.3, Doctrine ORM, PostgreSQL 16, and JWT authentication
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
- Contact page with required email and message fields, an optional Cloudflare Turnstile widget, and a honeypot; message delivery is not connected yet

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

Password-reset routes exist but are not yet functional: reset tokens are not persisted or validated, and submitting a new password does not update the account.

Authenticated account endpoint:

- `PATCH /api/profile/password`

Authenticated subscription endpoints:

- `GET`, `POST /api/subs`
- `GET`, `PUT`, `PATCH`, `DELETE /api/subs/{id}`

The Profile and Preferences pages are available from the account menu at `/profile` and `/preferences`. The default currency is stored in the current browser for the signed-in email and preselected on new subscriptions. Existing subscription amounts remain in their recorded currencies.

The plans page is available at `/plans` to signed-in and signed-out visitors. Its one-time upgrade button only shows an informational message; payment and Stripe checkout are not connected.

The contact form is available at `/contact` and is frontend-only. It validates the required email and message fields but does not send or store messages. Set the public `VITE_TURNSTILE_SITE_KEY` to display Turnstile; the widget stays hidden when no site key is configured. The honeypot and widget token are only frontend preparation until Symfony verifies submissions server-side. Keep the Turnstile secret in backend configuration, never in Vite environment variables.

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
