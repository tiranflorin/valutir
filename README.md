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

## Status & TODO:

Unfinished or buggy

1. ~~Deleted subscriptions don't really disappear.~~ **Fixed.** Deleting stays a soft delete (the row keeps `deletedAt`, cancellation date, and the `deletedUseful` answer), but all user-scoped queries in `SubscriptionRepository` now go through `createVisibleForUserQueryBuilder()`, which excludes soft-deleted rows. Deleted subscriptions no longer appear in `GET /api/subs` and return 404 for `GET`/`PUT`/`PATCH`/`DELETE /api/subs/{id}`, so the UI never sees them.
   - TODO: add an `app:subscriptions:purge-deleted` Symfony console command, scheduled via cron, that archives or permanently removes subscriptions soft-deleted longer than a retention period.
2. ~~Deleting sets the wrong status.~~ **Fixed** (together with #7). `SubscriptionService::delete()` now sets the status to `'cancelled'` instead of `false` (which was silently stored as `""`). Covered by `tests/Service/SubscriptionServiceTest.php`.
3. ~~Registration has almost no validation.~~ **Fixed.** `POST /api/register` moved to its own `RegistrationController`, which deserializes into a validated `RegisterRequest` DTO and delegates to `UserRegistrationService`:
   - Email: required, valid format, max 180 characters (the column length). Name: required, max 255. Malformed JSON or non-string fields return 400; validation failures return 422 with per-field `errors`.
   - Password: the new reusable `#[PasswordPolicy]` constraint (`src/Validator/`) requires at least 8 characters, plus any two of an uppercase letter, a number, or a symbol. The Register, New password, and Profile forms enforce the same rule. Previously they accepted any 3 of the 4 meter checks, so a 7-character password like `Ab1!xyz` passed.
   - Rate limited to 5 attempts per 15 minutes per client IP (429 with `Retry-After`).
   - No account enumeration: new and already-registered emails both get `202 Accepted` with the same message. The password is hashed on both paths so timing matches, and the existing account's owner gets an email with sign-in and reset links instead. The concurrent-duplicate race on the unique email index is handled the same way.
   - TODO: apply `#[PasswordPolicy]` to `ChangePasswordRequest` (which duplicates the rule inline in `ProfileController`) and to `POST /api/reset-password/new` (which only checks for 8+ characters).
   - TODO: consider email verification before activating new accounts, and case-insensitive email matching (currently `Foo@x.com` and `foo@x.com` are different accounts).
4. The API URL setting is inconsistent. AddSubscriptionPage uses VITE_API_BASE_URL with a localhost fallback, while every other page uses VITE_API_URL.
5. No account management: you can't change your name or email or delete your account, and there's no logout on the backend side (tokens simply expire after 24 hours).
6. Few tests. (Fixed separately: `ContactControllerTest` failed with a 429 after 5 runs within 15 minutes because rate-limiter state persisted in the filesystem cache and the test reset the wrong limiter key. The test environment now stores limiter state in memory via `cache.rate_limiter` in `config/packages/cache.yaml`.) Backend tests cover only the health check, the contact form, password reset and Turnstile. Subscription create/update/delete and the "can't access another user's data" checks have no tests. The frontend has 3 test files.
7. ~~Code standards are applied unevenly.~~ **Fixed.** Every file in `backend/src` now declares `strict_types=1`. Controllers, services, the DTO, the exception, the event subscriber, the security handlers, and the console command are `final`. Doctrine entities and repositories stay non-final on purpose (Doctrine proxies extend entities, and tests mock repositories). Enabling strict types exposed bug #2, now fixed. `POST /api/register` also rejects non-string fields with a 400 instead of a type error; its full validation is still #3.
8. ~~Subscription trial fields were returned from the wrong properties.~~ **Fixed.** `Subscription::toArray()` returned `startedAt` as `trialEndsAt` and `updatedAt` as `trialReminderSentAt`, so the UI showed the wrong trial end date. Because the cancel form sent that value back and the API only parsed `Y-m-d H:i:s`, cancelling from the UI also failed with a 400 for every subscription. Both fields now come from their own properties. `trialReminderSentAt` is server-owned: it's no longer accepted from clients (the frontend stopped sending it), and it's cleared whenever the trial end date changes so a new reminder can be sent. Covered by `tests/Entity/SubscriptionTest.php` and `tests/Service/SubscriptionServiceTest.php`.
   - TODO: actually send trial reminders (for example, a cron-run console command that emails users before `trialEndsAt` and sets `trialReminderSentAt`). Nothing sends them yet.
9. Frontend `type-check` and `lint` fail (CI runs only the frontend tests, which pass). `type-check` reports type-only imports needed under `verbatimModuleSyntax`, a few unused variables, and missing `@fullcalendar/*` modules in the `frontend-test` container. `lint` crashes on a module-resolution error, which suggests that container's `node_modules` is out of date.

I'd fix #1 and #2 first, since they're data-correctness problems in the app's main flow. Then registration validation (#3), then deciding what the Business/Plans feature actually is. I can make any of these fixes if you want.