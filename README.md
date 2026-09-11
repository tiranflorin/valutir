# ValuTir

ValuTir is a subscription tracker with a Symfony JSON API and a React single-page application. Track subscriptions, their billing cycles, and upcoming renewal dates in a calendar.

## Stack

- Symfony 7.4, PHP 8.3, Doctrine ORM, PostgreSQL 16, and JWT authentication
- React 18, TypeScript, Vite, MUI, and FullCalendar
- Docker Compose for local development, with MailDev for local email inspection

## Current capabilities

- Account registration and JWT login
- User-scoped subscription create, read, update, and soft-delete operations
- Subscription fields for amount, currency, cadence, category, payment method, status, dates, notes, and trial details
- Calendar renewal view with recurring events, selected-day details, and filters for status, category, billing cadence, and active subscriptions

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

Authenticated subscription endpoints:

- `GET`, `POST /api/subs`
- `GET`, `PUT`, `PATCH`, `DELETE /api/subs/{id}`

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
