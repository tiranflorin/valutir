# ValuTir

ValuTir is a subscription tracker with a Symfony JSON API and a React single-page application. Track subscriptions, their billing cycles, and upcoming renewal dates in a calendar.

## Stack

- Symfony 7.4, PHP 8.3, Doctrine ORM, PostgreSQL 16, JWT authentication, and server-side Turnstile verification
- React 18, TypeScript, Vite, MUI, and FullCalendar
- Docker Compose for local development, with MailDev for local email inspection

## Current capabilities

- Account registration and JWT login
- User-scoped subscription create, read, update, and soft-delete operations (soft-deleted subscriptions are kept in the database but hidden from the API)
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

## Status & TODO

Fixed items are removed from this list; the git history records what changed. Items marked **Later** are planned but deliberately deferred.

### Correctness and reliability

1. **Later: tests don't cover the rules that matter most.** Decided for now: backend tests stay database-free. There are 62 backend and 24 frontend tests, but no backend test reaches a database. User isolation on subscriptions (user B can't read or change user A's), the subscription create/update/delete flow over HTTP, and token revocation through the firewall are untested. Several service tests are mock-heavy and assert implementation details. The frontend recurrence logic (`utils/buildRecurringOccurrences.ts`) has no tests.
   - Plan: a base test case on a real test database (`valutir_test`, tables truncated per test), a few HTTP scenario tests (subscriptions, sessions, account) replacing most mock tests, and unit tests for the recurrence utilities.
   - CI: the CI env file points `DATABASE_URL` at host `db`, which the GitHub Actions Postgres service doesn't provide (it needs `127.0.0.1` and a published port), and the workflow never generates JWT keys. Both block database tests in CI.
2. **Later, high priority (core product functionality): trial reminders are never sent.** The form previews a reminder and `trialReminderSentAt` exists, but nothing emails users before `trialEndsAt`. Add a cron-run console command that sends them and sets `trialReminderSentAt`.

### Security and operations

3. **The committed backend CI env file contains a JWT passphrase.** Treat it as exposed: rotate it if it protects anything real, and move CI secrets to GitHub Actions secrets.
4. **No email verification for new accounts, and emails are case-sensitive** (`Foo@x.com` and `foo@x.com` are different accounts).
5. **The token blocklist lives in `cache.app` (filesystem).** Use a shared pool such as Redis before running more than one backend instance.
6. **Lowest priority: purge old soft-deleted subscriptions.** Add an `app:subscriptions:purge-deleted` command, run by cron, that archives or removes subscriptions soft-deleted longer than a retention period.

### Product gaps and mocks

7. **Plans / Business upgrade is a mock.** The price is "to be decided", the upgrade button only shows a notice, and there is no checkout and no plan stored on the account.
8. **The Business view is only a filter** on the `b2b` flag (no business account or team).
9. **Household sharing is a placeholder** (the "Shared with household" metric and the disabled "Shared" filter chip).
10. **No account data export** before deletion.