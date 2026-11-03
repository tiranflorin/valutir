# ValuTir project guide

ValuTir is a subscription tracker with a Symfony JSON API and a React single-page application. The repository root combines the backend and frontend Docker Compose files.

## Repository layout

```text
.
├── docker-compose.yml       # Includes backend and frontend Compose definitions
├── backend/                 # Symfony 7.4 API (PHP 8.3)
│   ├── src/
│   │   ├── Controller/      # API and health endpoints
│   │   ├── Dto/             # Request DTOs and validation
│   │   ├── Entity/          # Doctrine User and Subscription entities
│   │   ├── EventSubscriber/ # JSON API exception handling
│   │   ├── Repository/      # User-scoped persistence queries
│   │   ├── Security/        # API auth error responses
│   │   └── Service/         # Subscription business logic
│   ├── migrations/          # Doctrine migrations
│   ├── tests/               # PHPUnit tests
│   └── docker/              # PHP development image
└── frontend/                # React 18 + TypeScript + Vite application
    ├── src/
    │   ├── components/      # Shared, subscription, and calendar UI
    │   ├── context/         # Authentication and MUI theme providers
    │   ├── hooks/           # Calendar-event logic
    │   ├── pages/           # Route-level screens
    │   ├── services/        # Authentication API calls
    │   ├── test/            # Vitest/React Testing Library tests
    │   ├── types/           # Domain/API TypeScript types
    │   └── utils/           # Recurrence and calendar helpers
    ├── build/               # Build-time helpers (Cloudflare _headers generation)
    └── docker/              # Vite dev image
```

## Backend

### Authentication and authorization

- Symfony Security uses the `User` entity as the identity provider, keyed by email.
- `POST /api/login_check` authenticates JSON `{ "email", "password" }` and LexikJWTAuthenticationBundle returns a JWT.
- JWTs are stateless, sent as `Authorization: Bearer <token>`, and have a 24-hour TTL.
- Token revocation: `POST /api/logout` adds the current token to Lexik's blocklist (`cache.app`). Every JWT also carries a `tv` claim matching `User::$tokenVersion`; `TokenVersionListener` rejects mismatches. Call `User::revokeAllTokens()` whenever every session must end (sign out everywhere, password change or reset, email change).
- Public endpoints: `/api/login*`, `/api/register`, `/api/contact`, `/api/reset-password*`, `/api/profile/email/confirm`, and `/api/reminders/unsubscribe` (signed token). All other `/api` endpoints require a fully authenticated user.
- `ApiAuthenticationEntryPoint`, `ApiAccessDeniedHandler`, and `ApiExceptionSubscriber` keep API errors JSON-shaped.
- Do not read, print, grep, expose, log, commit, or repeat values from local `.env` files (`.env`, `.env.local`, `.env.ci`, `.env.dev`, `.env.test`, ...), JWT keys (`config/jwt/*.pem`), or environment dumps (`printenv`, `env`, `docker compose config`, `docker inspect`, `debug:dotenv`). Use the committed templates (`.env.dist`, `.env.sample`) for variable names. For AI agents this is enforced by `.claude/settings.json` and `.claude/hooks/block-env-secrets.py`; treat a block as intended and ask the user instead of working around it.

### Persistence

- PostgreSQL 16 is the database; Doctrine ORM uses PHP attributes and Doctrine migrations.
- Emails are case-insensitive: always go through `User::setEmail()` / `User::normalizeEmail()` (trim + lowercase) and look users up with `UserRepository::findOneByEmail()`, never `findOneBy(['email' => ...])`. The security provider uses `UserRepository::loadUserByIdentifier()`, and the database enforces lowercase with `CHECK (email = LOWER(email))` next to the unique index.
- `user`: ID, unique email, JSON roles, hashed password, name, default currency, token version, IANA `timezone` (default `Europe/Berlin`), and reminder settings (`remindersEnabled`, `remindersProcessedOn`).
- `subscription`: belongs to a user through a required `user_id` FK with `ON DELETE CASCADE`; it stores monetary, cadence, status, date, notes, payment, trial, household-sharing, and audit information.
- Household sharing: `householdShared` + `householdSize` (2-10 people, the owner included) split a bill equally; personal subscriptions only. Always set both through `Subscription::setHouseholdSharing()`, and send both in every subscription PUT/PATCH payload (updates replace every field, so omitting them unshares the subscription). Frontend share maths lives in `src/utils/householdShare.ts`.
- Billing dates: charges are counted from the stored `nextBillingDate` with month-end clamping (`App\Billing\BillingSchedule`, mirrored by `frontend/src/utils/buildRecurringOccurrences.ts`; keep them in sync). "Today" for a user is their local calendar day (`App\Billing\UserTime`); servers and the database stay on UTC. Use the `App\Clock\Clock` interface instead of `new \DateTimeImmutable()` in code that the scheduled commands run.
- Reminders: `app:subscriptions:advance-billing-dates` then `app:reminders:send`, hourly (see README "Scheduled commands"). `reminder_log` has a unique key per subscription, kind, and charge date so a charge is reminded once; lead times live in `App\Reminder\ReminderPolicy` (mirrored in `frontend/src/utils/reminders.ts`).
- Subscription repository queries must remain scoped to the authenticated user. `findOneByIdAndUser()` is the pattern for single-record access.
- Deleting a subscription is a soft delete: record `deletedAt`, cancellation metadata, and `deletedUseful`; do not assume a DELETE removes its row.

### API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Basic service health response |
| `POST /api/register` | Create a user |
| `POST /api/login_check` | Obtain a JWT |
| `POST /api/reset-password/request` | Request password-reset email |
| `POST /api/reset-password/new` | Submit a new password (signs out every device) |
| `POST /api/logout` | Revoke the current token (this device) |
| `POST /api/logout/all` | Revoke every token for the user (all devices) |
| `GET /api/profile` | Current user's email, name, default currency, time zone, reminder setting, and pending email change |
| `PATCH /api/profile` | Update any of `name`, `defaultCurrency` (`EUR`, `USD`, `RON`), `timezone` (IANA), `remindersEnabled` |
| `PATCH /api/profile/password` | Change password (current password required); returns a fresh token and signs out other devices |
| `POST /api/profile/email` | Start an email change (current password required); emails a confirmation link to the new address |
| `POST /api/profile/email/confirm` | Public; apply an email change from its link token and sign out every device |
| `DELETE /api/profile` | Permanently delete the account and its data (current password required) |
| `POST /api/reminders/unsubscribe?token=…` | Public; turn payment reminders off from the signed link in a reminder email (one-click unsubscribe) |
| `GET /api/subs` | List the current user's subscriptions |
| `POST /api/subs` | Create a subscription |
| `GET /api/subs/{id}` | Read a user-owned subscription |
| `PUT` / `PATCH /api/subs/{id}` | Update a user-owned subscription |
| `DELETE /api/subs/{id}` | Soft-delete; body requires boolean `usedAndUseful` |

- Subscription payloads are deserialized into `SubscriptionUpsertRequest`, validated, then mapped by `SubscriptionService`.
- Supported billing cadences are `weekly`, `monthly`, `quarterly`, and `yearly` (frontend form, API validation, `BillingSchedule::CADENCES`). Rows saved earlier may still hold `daily`; the scheduled commands skip unknown cadences.
- CORS allows only the `FRONTEND_URL` origin (`%frontend_url%`, default `http://localhost:5173`); the same parameter builds links in emails, so keep it an origin without a path or trailing slash.
- Account endpoints that check the current password are limited to 5 failed attempts per 15 minutes per user; responses never reveal whether another email is registered.
- Use `Request::getClientIp()` for client IPs (never read `X-Forwarded-For`, `CF-Connecting-IP`, or similar headers directly). Proxies are trusted only through `SYMFONY_TRUSTED_PROXIES` (`framework.yaml`); `X-Forwarded-Host` is intentionally not trusted.

## Frontend

- React Router defines public home/authentication routes and JWT-protected subscription/calendar routes.
- `AuthContext` stores the JWT in browser `localStorage` under `valutir_auth_token`, loads the account from `GET /api/profile`, and revokes the token on logout; `ProtectedRoute` redirects unauthenticated users to `/login`. Account API calls live in `services/account.ts`.
- MUI supplies the UI system. `AppThemeProvider` owns light/dark mode, while `AppHeader` and `AppShell` are shared layout primitives.
- API calls use `fetch` and attach the JWT bearer token. Build URLs from `API_URL` in `src/config.ts` (the only place that reads `VITE_API_URL`); never read `import.meta.env` directly in components. Production builds require `VITE_API_URL` (a Cloudflare build variable).
- Production hosting is Cloudflare (Pages or Workers static assets); the API and database run on AWS. Security headers are generated at build time into `dist/_headers` by `frontend/build/securityHeaders.ts` (CSP `connect-src` comes from `VITE_API_URL`). When adding an external script, frame, font, image, or API origin, add it to that CSP. HSTS is set in the Cloudflare dashboard, not in `_headers`.
- The calendar uses FullCalendar. It derives recurring events from subscriptions client-side through `useCalendarEvents` and the recurrence utilities.
- Keep API contracts aligned with `frontend/src/types/subscription.ts` and the backend DTO/entity serialization.

## Local development

From the repository root:

```bash
docker compose up -d --build
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

Local services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- Health check: `http://localhost:8080/health`
- MailDev inbox: `http://localhost:1080`
- PostgreSQL: `localhost:5432`

The current Docker configuration uses port `5173` for Vite.

Optional development admin:

```bash
docker compose exec backend php bin/console app:create-admin
```

The command has hard-coded development credentials. Do not use it for production or repeat those credentials in documentation/output.

## Verification commands

```bash
# Backend
docker compose exec backend php vendor/bin/phpunit

# Frontend tests
docker compose run --rm frontend-test npm run test:run

# Frontend static checks/build
docker compose run --rm frontend-test npm run type-check
docker compose run --rm frontend-test npm run lint
docker compose run --rm frontend-test npm run build
```

Backend tests are database-free (unit tests, plus HTTP tests for requests rejected before any database access). Frontend tests use Vitest, JSDOM, and React Testing Library. Frontend CI runs type-check, lint, tests, and build; keep all four passing.

After `package.json` changes, refresh the test container's dependencies (they live in an anonymous `node_modules` volume that survives rebuilds): `docker compose up -d --build --renew-anon-volumes frontend-test`.

## PHP/Symfony enterprise code and security rules

Apply these rules to all new or materially changed backend code. They are intentionally compact; the PHP-CS-Fixer `@Symfony` preset (which extends `@PER-CS`) is the formatting baseline.

### Code quality and design

- Format PHP with PHP-CS-Fixer `@Symfony`; use PSR-4, one class per file, strict comparisons, braces for every control block, trailing commas in multi-line arrays, and meaningful English names.
- New PHP files should begin with `declare(strict_types=1);`. Use scalar/object return types, nullable types, `readonly` dependencies where appropriate, and `final` for classes not designed for extension.
- Keep controllers thin: authenticate/authorize, deserialize, delegate to an application service, and return a response. Keep persistence queries in repositories and business rules in services.
- Use constructor injection and Symfony interfaces; do not use the service locator, static global state, or direct environment reads in application code.
- Use DTOs plus Symfony Validator constraints for every write boundary. Explicitly map allowed fields; never hydrate an entity directly from client JSON.
- Make API contracts explicit and stable. Use correct HTTP methods/status codes, reject malformed JSON, and add/update focused tests for changed behavior, validation failures, and authorization.
- Prefer small, single-purpose changes. Do not combine unrelated formatting refactors with functional changes; run `git diff --check` before handoff.

### Security requirements

- Treat every request value, uploaded file, message, and external-service response as untrusted. Validate type, length, format, range, and enum values at the boundary; prefer allow-lists over deny-lists.
- Enforce authorization server-side for every resource and action. A valid JWT is not sufficient: look up user-owned resources through user-scoped repository queries or use an explicit voter/policy. Never trust a client-supplied user ID, role, ownership, price, or status.
- Keep authentication errors generic to avoid account enumeration. Use Symfony's password hasher; never write, compare, email, or log plaintext passwords. Add login throttling/rate limits to any internet-facing login or reset flow.
- Protect state changes with non-GET methods. If authentication changes to cookies/session credentials, add CSRF protection; bearer-token APIs still need strict CORS and authorization.
- Use Doctrine repository/QueryBuilder parameters or prepared statements only. Never concatenate untrusted input into DQL, SQL, shell commands, file paths, URLs, headers, or expressions; allow-list unavoidable dynamic identifiers and command arguments.
- Do not expose exception traces, SQL errors, framework debug output, internal IDs, tokens, passwords, authorization headers, or reset data in production responses. Return a consistent generic API error and log only sanitized diagnostic context.
- Never commit or hard-code secrets, credentials, private keys, tokens, production URLs, or personal data. Keep secrets in deployment-managed environment variables or Symfony Secrets; rotate anything exposed. Redact sensitive headers and request fields before logging.
- Use least-privilege database/service credentials, HTTPS in deployed environments, restrictive CORS origins/methods/headers, and secure response headers at the edge. Review dependency updates and run `composer audit` before releases.
- Avoid unsafe deserialization, `eval`, dynamic includes, and shell execution. For outbound URLs, use an allow-list and block private/internal address ranges to prevent SSRF.
- Record security-sensitive events (authentication failures, access denials, password resets, privilege changes) without sensitive payloads, and test that unauthorized, cross-user, malformed, and rate-limited requests fail safely.

Reference material: Symfony's [coding conventions](https://symfony.com/doc/current/contributing/code/conventions.html) and [security documentation](https://symfony.com/doc/current/security.html), the PHP-CS-Fixer [`@Symfony` ruleset](https://cs.symfony.com/doc/ruleSets/Symfony.html), PHP-FIG [PER-CS](https://www.php-fig.org/per/coding-style/meta/migration-2.0/), and OWASP guidance for [secure review](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html), [SQL injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html), and [REST APIs](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

## Working conventions

- Make database changes through new Doctrine migrations; do not edit already-applied migrations. `Version20261102200000` is the initial schema (the earlier incremental migrations were squashed into it); add new migrations after it and keep `doctrine:schema:validate` passing.
- Keep authentication and ownership checks in backend code even when the frontend has route guards.
- Preserve JSON error responses for `/api` routes.
- Avoid committing generated build output, local environment files, private JWT material, or database volumes.
