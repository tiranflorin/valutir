# Local development

How to run, test, and configure ValuTir on your machine. Product overview: [README](../README.md).

Prerequisites: Docker Desktop (or Docker Engine with Compose). Create `backend/.env` from `backend/.env.sample` and `frontend/.env` from `frontend/.env.dist`, fill in your own values, and generate the JWT key pair. Keep these files and keys out of version control.

```bash
docker compose up -d --build
docker compose exec backend php bin/console lexik:jwt:generate-keypair --skip-if-exists
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

Local services:

| Service | Address |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend health check | http://localhost:8080/health |
| MailDev inbox | http://localhost:1080 |
| PostgreSQL | localhost:5432 |
| Production image (opt-in, see below) | http://localhost:8081/health |

The backend image is `backend/docker/Dockerfile`, served by FrankenPHP (`backend/docker/Caddyfile`) in classic mode, so every request starts fresh, like PHP-FPM. It has two targets:

- `dev`, used by `docker compose up`: Xdebug and dev dependencies, with your code bind-mounted, so changes apply on the next request.
- `prod`: the image that ships. It has no dev dependencies or Xdebug, OPcache never re-checks files, Symfony's cache is warmed at build, it runs as an unprivileged user with a health check, and it contains no secrets (every setting comes from environment variables).

Try the production image against your local database before a release. It runs on port 8081 with exactly what's baked into the image, no code mounted:

```bash
docker compose --profile prod up -d --build backend-prod
curl http://localhost:8081/health
docker compose --profile prod stop backend-prod
```

Useful commands:

```bash
# Follow service logs
docker compose logs -f backend
docker compose logs -f frontend

# Backend tests and code style
docker compose exec backend php vendor/bin/phpunit
docker compose exec backend vendor/bin/php-cs-fixer fix --dry-run --diff

# Frontend checks (all four run in CI)
docker compose run --rm frontend-test npm run type-check
docker compose run --rm frontend-test npm run lint
docker compose run --rm frontend-test npm run test:run
docker compose run --rm frontend-test npm run build

# After changing frontend dependencies, refresh the test container's node_modules volume
docker compose up -d --build --renew-anon-volumes frontend-test
```

## Configuration

Variable names only; templates are `backend/.env.sample` and `frontend/.env.dist`. Never commit real values.

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL`, `DB_PASSWORD` | backend | PostgreSQL connection |
| `APP_SECRET` | backend | Symfony secret (also signs reminder unsubscribe links) |
| `JWT_SECRET_KEY`, `JWT_PUBLIC_KEY`, `JWT_PASSPHRASE` | backend | JWT key pair and its passphrase |
| `MAILER_DSN` | backend | Email transport (MailDev locally, Amazon SES in production) |
| `FRONTEND_URL` | backend | The app's origin (`scheme://host[:port]`, no trailing slash): base URL for links in emails and the only CORS-allowed origin |
| `DEFAULT_URI` | backend | The API's public URL, used for URLs built in console commands (one-click unsubscribe) |
| `SYMFONY_TRUSTED_PROXIES` | backend | Reverse proxies allowed to pass on the client IP and scheme; empty locally. See [Client IPs behind proxies](cloudflare-and-proxies.md#client-ips-behind-proxies) |
| `CONTACT_RECIPIENT` | backend | Mailbox for contact-form messages |
| `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` | backend | Cloudflare Turnstile verification |
| `STRIPE_MODE` | backend | `test` (default: test keys only, on any machine, including staging) or `live` (live keys only, and only with `APP_ENV=prod`). A key from the other environment turns checkout off. See [Stripe keys and modes](payments.md#stripe-keys-and-modes) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | backend | Stripe API key (`sk_…` or restricted `rk_…`) and webhook signing secret (`whsec_…`); empty turns checkout off. See [Payments](payments.md) |
| `STRIPE_AUTOMATIC_TAX` | backend | `1` (default) to calculate VAT with Stripe Tax at checkout, `0` to turn it off |
| `VITE_API_URL` | frontend | API base URL; required for builds (a Cloudflare build variable in production). Its origin is also the only API origin the CSP allows |
| `VITE_TURNSTILE_SITE_KEY` | frontend | Cloudflare Turnstile site key (public) |

## Repository layout

```text
backend/   Symfony API, console commands, Doctrine migrations, and PHPUnit tests
frontend/  React application, calendar UI, and Vitest tests
docs/      Go-live checklist (go-live-checklist.md)
```

Coding and security conventions for contributors (and AI agents) are in [AGENTS.md](../AGENTS.md).
