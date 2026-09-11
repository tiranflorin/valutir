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
    └── docker/              # Vite dev and Nginx production images
```

## Backend

### Authentication and authorization

- Symfony Security uses the `User` entity as the identity provider, keyed by email.
- `POST /api/login_check` authenticates JSON `{ "email", "password" }` and LexikJWTAuthenticationBundle returns a JWT.
- JWTs are stateless, sent as `Authorization: Bearer <token>`, and have a 24-hour TTL.
- Public endpoints: `/api/login*`, `/api/register`, and `/api/reset-password*`. All other `/api` endpoints require a fully authenticated user.
- `ApiAuthenticationEntryPoint`, `ApiAccessDeniedHandler`, and `ApiExceptionSubscriber` keep API errors JSON-shaped.
- Do not expose, log, commit, or repeat values from local `.env` files or JWT keys.

### Persistence

- PostgreSQL 16 is the database; Doctrine ORM uses PHP attributes and Doctrine migrations.
- `user`: ID, unique email, JSON roles, hashed password, and name.
- `subscription`: belongs to a user through a required `user_id` FK with `ON DELETE CASCADE`; it stores monetary, cadence, status, date, notes, payment, trial, and audit information.
- Subscription repository queries must remain scoped to the authenticated user. `findOneByIdAndUser()` is the pattern for single-record access.
- Deleting a subscription is a soft delete: record `deletedAt`, cancellation metadata, and `deletedUseful`; do not assume a DELETE removes its row.

### API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Basic service health response |
| `POST /api/register` | Create a user |
| `POST /api/login_check` | Obtain a JWT |
| `POST /api/reset-password/request` | Request password-reset email |
| `POST /api/reset-password/new` | Submit a new password |
| `GET /api/subs` | List the current user's subscriptions |
| `POST /api/subs` | Create a subscription |
| `GET /api/subs/{id}` | Read a user-owned subscription |
| `PUT` / `PATCH /api/subs/{id}` | Update a user-owned subscription |
| `DELETE /api/subs/{id}` | Soft-delete; body requires boolean `usedAndUseful` |

- Subscription payloads are deserialized into `SubscriptionUpsertRequest`, validated, then mapped by `SubscriptionService`.
- Supported backend billing cadences are `daily`, `weekly`, `monthly`, `quarterly`, and `yearly`.
- CORS is configured for the Vite development origin: `http://localhost:5173`.
- The password-reset implementation is incomplete: reset tokens are not persisted or validated, and the new-password endpoint does not change the password. Treat this as an implementation limitation when working in that area.

## Frontend

- React Router defines public home/authentication routes and JWT-protected subscription/calendar routes.
- `AuthContext` stores the JWT in browser `localStorage` under `valutir_auth_token`; `ProtectedRoute` redirects unauthenticated users to `/login`.
- MUI supplies the UI system. `AppThemeProvider` owns light/dark mode, while `AppHeader` and `AppShell` are shared layout primitives.
- API calls use `fetch` and attach the JWT bearer token. The usual backend URL is `VITE_API_URL`; note that `AddSubscriptionPage` currently uses `VITE_API_BASE_URL` with a localhost fallback, so keep API URL configuration consistent if modifying that page.
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

The current Docker configuration uses port `5173` for Vite; references to port `3000` in the README are stale.

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

Existing backend coverage is currently limited to the health endpoint. Frontend tests use Vitest, JSDOM, and React Testing Library.

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

- Make database changes through new Doctrine migrations; do not edit already-applied migrations.
- Keep authentication and ownership checks in backend code even when the frontend has route guards.
- Preserve JSON error responses for `/api` routes.
- Avoid committing generated build output, local environment files, private JWT material, or database volumes.
