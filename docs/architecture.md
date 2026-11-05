# ValuTir deployment architecture

How ValuTir is deployed and operated: an MVP that's secure and cheap, reachable over the internet for testing, and deployed automatically when a PR is merged into `release`. This page records the decisions made so far and the questions still open. Nothing here has been built yet.

Related: [go-live checklist](go-live-checklist.md) (what must be true before real payments), [README](../README.md) (what the app does), [status-and-todo.md](status-and-todo.md) (known issues; "TODO #N" refers to it).

## Decision log

| Topic | Decision | Status |
|---|---|---|
| Domain | `valutir.app` (registered in Cloudflare). App at `https://valutir.app`, API at `https://api.valutir.app` | Decided |
| Edge and bot protection | Cloudflare Free plan only: DNS, TLS, CDN, free WAF managed rules, one rate-limiting rule, Turnstile | Decided |
| Frontend hosting | Cloudflare Pages (static Vite build), deployed by the pipeline with `wrangler`. Workers static assets was considered and not chosen; see below | Decided (2026-11-05) |
| Node.js | 24 (LTS) everywhere: CI, the deploy build, and the local dev image | Decided |
| Backend hosting | One small EC2 instance running the PHP app in Docker. No load balancer, NAT gateway, Kubernetes, ECS, or Lambda | Decided |
| Server size | EC2 `t4g.small` (2 vCPU, 2 GB RAM, ARM/Graviton), 20 GB gp3 storage | Decided |
| Origin connectivity | Cloudflare Tunnel: connections go out from AWS only, and the instance accepts no inbound traffic | Decided |
| Region | AWS `eu-central-1` (Frankfurt), matching the Privacy policy | Decided |
| Database | Amazon RDS for PostgreSQL, `db.t4g.micro`, Single-AZ, 20 GB **gp2** storage while on the free tier (gp3 afterwards), automated backups and point-in-time recovery. No code changes, configuration only (see [Database](#database)) | Decided |
| Deploys | GitHub Actions on merge to `release`, after all checks pass. AWS access through OIDC, images in ECR, rollout through SSM | Decided |
| Repositories | Keep the monorepo: one pipeline deploys the backend, then the frontend | Decided |
| Infrastructure as code | Terraform for the AWS resources, kept small, in a **separate repository** (`valutir-infra`); see [Infrastructure repository](#infrastructure-repository) | Decided |
| Scheduled commands | A systemd timer on the instance runs the hourly commands. No queue or worker: the commands are already idempotent (a unique key per charge) | Decided |
| PHP runtime in the container | FrankenPHP in classic mode, the same image locally (`dev` target) and in production (`prod` target); see [PHP runtime](#php-runtime) | Decided, running locally |
| Terraform state | S3 bucket in the AWS account, `eu-central-1`: versioning on, encrypted, public access blocked, S3 native state locking (`use_lockfile`, so no DynamoDB table) | Decided |
| Repository visibility | Public for now; may become private later. See [Repository visibility](#repository-visibility). The committed JWT passphrase (TODO #5) is exposed either way, so production gets newly generated JWT keys and passphrase | Decided (public) |

Deliberately not used for the MVP:

- **A proxy that puts the app and API on one origin** (Pages Functions or a Worker): every API call would run through it (the Free plan allows 100,000 Function requests a day), and it's extra code. The API already handles CORS, and the Tunnel already locks the origin.
- **Cloudflare Access:** a login gate for internal tools, not for a public API.
- **Bot Fight Mode:** on the Free plan it can't be bypassed with WAF rules, so it could challenge Stripe's webhooks and other non-browser API calls.
- **A PHP 8.5 upgrade:** possible later; not a deployment blocker.
- **Workers static assets instead of Pages:** Cloudflare now recommends Workers for new projects and adds new features there first. For a plain static SPA both are free, both read `_headers`, and both serve `index.html` for client-side routes. Workers would add a `wrangler.jsonc` file and only matters once server-side code at the edge is needed. Revisit only if the app needs code at the edge; moving later is a config change, not a code change.

## Target architecture

```
Browser ──► https://valutir.app       Cloudflare Pages: React build (free)
   │
   └──► https://api.valutir.app       Cloudflare: DNS, TLS, free WAF rules, 1 rate-limit rule
            │  Cloudflare Tunnel (cloudflared connects out from AWS; no open ports)
            ▼
   AWS eu-central-1
   └─ EC2 t4g.small (2 GB, 20 GB gp3), no inbound rules, no SSH
       ├─ cloudflared             tunnel agent
       ├─ valutir-api             the one PHP container (Symfony, PHP 8.3)
       └─ systemd timer, hourly:  app:subscriptions:advance-billing-dates → app:reminders:send → cache:pool:prune
            │  private VPC network, TLS required
            ▼
   RDS for PostgreSQL db.t4g.micro (private, encrypted, Single-AZ, automated backups)
   Amazon SES (email) · SSM Parameter Store (secrets) · ECR (images) · CloudWatch (logs, 30-day retention)
```

The app and the API are on two hostnames, so the browser makes cross-origin calls. That already works: the API's CORS allows only `FRONTEND_URL` (`https://valutir.app`), and the CSP's `connect-src` comes from `VITE_API_URL` (`https://api.valutir.app`).

## PHP runtime

**Decided: FrankenPHP 1.13.1 (PHP 8.3) in classic mode.** It's in place locally: `backend/docker/Dockerfile` has a `dev` target (used by Docker Compose, with Xdebug) and a `prod` target (the production image). `backend/docker/Caddyfile` serves plain HTTP on :8080 with no admin API, no access logs (they'd record visitor IPs), and no `Server` header. The production image can be run locally with `docker compose --profile prod up -d --build backend-prod` ([development.md](development.md)). Both were tested locally: the backend test suite, migrations, an end-to-end flow (register, verify email, sign in, subscription, billing, sign out), and the scheduled commands.

The comparison that led to the decision:

| | FrankenPHP | Nginx + PHP-FPM |
|---|---|---|
| Processes | **One** (a Caddy-based web server with PHP built in), so a real single container | Two (Nginx and PHP-FPM). In one container they need a process supervisor (supervisord or s6), a recognized Docker anti-pattern; the clean alternative is two containers |
| Setup | Official ARM64 image, a few lines of config | Nginx config plus FPM pool tuning (`pm.max_children` sized to the 2 GB of memory) |
| Local development | The same image can replace PHP's built-in server, so dev and prod match | Possible, with more moving parts |
| Performance | Classic mode is like FPM. Optional **worker mode** keeps Symfony loaded between requests, typically 2–4× faster; Symfony 7.4 supports it | Proven and predictable |
| Request isolation | Classic mode: each request starts fresh. Worker mode: state can leak between requests (for example Doctrine's entity manager) unless the services are reset, so test before turning it on | Each request starts fresh |
| Maturity | Younger (1.0 in 2023), and it's the Symfony community's default (the official Symfony Docker template) | Decades in production, with very wide documentation |
| HTTPS | Built-in automatic HTTPS and HTTP/2/3, not needed here: Cloudflare terminates TLS, and the container serves plain HTTP inside the instance only | Same: plain HTTP inside the instance |

Why classic mode first: it gives the single container and the simpler setup with no request-isolation risk. ValuTir's early traffic doesn't need worker mode's speed. Turn it on later, after a load test and once the backend has database-backed tests (TODO #1).

## Production image

There's one Dockerfile, `backend/docker/Dockerfile`, with two targets on a shared base (FrankenPHP 1.13.1 with PHP 8.3, the PHP extensions, and the Caddyfile). `dev` is what Docker Compose runs locally; `prod` is what ships. Nothing is built on the server: the pipeline builds the image once, and the instance only pulls and runs it.

**Build** (GitHub Actions, on merge to `release`, on an ARM64 runner):

```bash
docker build -f docker/Dockerfile --target prod -t <ecr-repository>:<commit-sha> backend/
```

What the `prod` target does:

1. Sets `APP_ENV=prod` and `APP_DEBUG=0`, and uses PHP's production `php.ini` plus `docker/php-prod.ini` (OPcache never re-checks files; 256 MB per request).
2. `composer install --no-dev`: no test tools, no Xdebug.
3. Copies the code. `.dockerignore` keeps out every `.env*` file, the JWT keys, `vendor/`, `var/`, and `.git`.
4. Writes a `.env.local.php` holding only `APP_ENV=prod` and `APP_DEBUG=0` (Symfony needs one to boot), builds an optimized autoloader, and warms Symfony's cache with throwaway build-time values. Nothing connects to a database during the build.
5. Removes Composer, switches to an unprivileged `app` user (uid 10001), and adds a Docker `HEALTHCHECK` on `/health`.

The result holds the code and the compiled cache, and no secrets. It's pushed to ECR tagged with the commit SHA, and that exact image is what the migration, the app container, and the hourly commands run.

**Run** (on the instance, by `/opt/valutir/deploy.sh <tag>` from `valutir-infra`):

| Step | What happens |
|---|---|
| Settings and secrets | The script reads `/valutir/prod/*` from SSM Parameter Store into a root-only env file (`/opt/valutir/app.env`, mode 600) that Compose passes to the container, and writes the JWT key pair to files mounted read-only (`JWT_SECRET_KEY=/run/jwt/private.pem`, as in the local `backend-prod` service). Real environment variables take precedence over the image's `.env.local.php`. |
| Pull | `docker pull <ecr-repository>:<tag>` |
| Migrate | A one-off container from the new image runs `php bin/console doctrine:migrations:migrate --no-interaction` while the old container still serves traffic |
| Restart | Compose replaces the `valutir-api` container with the new image. The API answers 502 through the Tunnel for the few seconds this takes |
| Check | `/health` from inside the instance. On failure, the previous tag is started again. The migration stays applied, so each migration must also work with the previous release |

Port 8080 isn't published on the host: only `cloudflared`, on the same Compose network, can reach it.

**One-off console commands** (for example making someone an admin): open a shell on the instance with SSM Session Manager (`aws ssm start-session --target <instance-id>`; no SSH or open port), then run the command in a one-off container of the deployed image. For an admin: register in the app and confirm the email first, then grant the role, so no password is ever typed on the server:

```bash
sudo docker compose -f /opt/valutir/compose.yaml run --rm valutir-api php bin/console app:create-admin you@example.com
```

**Try it locally:** `docker compose --profile prod up -d --build backend-prod` builds the same target and runs it on port 8081 against the local database, with no code mounted ([development.md](development.md)).

## Scheduled commands

A systemd timer on the instance (`OnCalendar=hourly`, with `Persistent=true` so a run missed while the instance was down happens at boot) starts a oneshot service. The service runs each command in a one-off container of the currently deployed image, in this order:

1. `app:subscriptions:advance-billing-dates`
2. `app:reminders:send`
3. `cache:pool:prune`

A failing step stops the rest of that run, and the next hourly run retries: every command is idempotent (a unique key per charge in `reminder_log`). There's no queue, worker, EventBridge, or ECS. The timer and service units are part of `valutir-infra`. Still open: how a failed run raises an alert (TODO #2). Command details: [scheduled-commands.md](scheduled-commands.md).

## Repository visibility

Public for now. Making it private later changes no access between the systems: the AWS OIDC trust is tied to the repository name and the `release` branch, not to visibility, and Cloudflare, Stripe, EC2, and RDS don't see GitHub at all. What changes is on GitHub's side:

| | Public | Private |
|---|---|---|
| Protected `release` branch (required PR and checks) | Free on GitHub Free | **Needs a paid plan** (GitHub Pro, ~$4/month). On GitHub Free, private repositories can't use branch protection, so nothing would block a direct push to `release` |
| ARM64 builds | GitHub's ARM runners are free | Use the plan's included minutes if ARM runners are offered, or build with emulation on a standard runner (slower, a few minutes) |
| Workflow logs | **Public**: the pipeline must never print secrets or environment values | Private |
| Code | Readable by anyone, so it must never contain secrets (already an AGENTS.md rule) | Private, but anything already pushed stays exposed |

## Cloudflare (Free plan)

- **DNS:** `valutir.app` points to the Pages project, and `api.valutir.app` to the Tunnel.
- **Routing to the API, with no load balancer:** there's one backend, so there's nothing to balance. `api.valutir.app` is a proxied record for the Tunnel. Cloudflare's edge sends each API request through the Tunnel to `cloudflared` on the instance, which forwards it to `http://valutir-api:8080`. `cloudflared` keeps four outbound connections to two Cloudflare data centers, so one dropped connection doesn't cut the API off. That's redundancy for the tunnel, not load balancing.
  - Scaling out later: a second instance running its own `cloudflared` for the same Tunnel. Cloudflare then sends each request to the nearest connected replica, without health checks, so it's still not real load balancing. For balancing with health checks, add Cloudflare Load Balancing (paid). The app keeps no state in the container, so either works without code changes.
- **TLS:** Full (strict). HSTS goes on once both hostnames work over HTTPS.
- **Bot and abuse protection:**
  - the free managed WAF rules;
  - the "Block AI bots" toggle;
  - the one free rate-limiting rule, on `POST /api/login_check`;
  - Turnstile, already on the contact form;
  - the API's own rate limits and login throttling.

  Bot Fight Mode stays off (see above).
- **WAF custom rule:** on `api.valutir.app`, allow only `/api/*` and `/health`.
- **Pages:** production deploys come from the pipeline (`wrangler pages deploy`), not from Cloudflare's own Git integration, so nothing reaches production without passing the checks.

## AWS components

| Component | Setup |
|---|---|
| EC2 | `t4g.small`, Amazon Linux 2023, 20 GB encrypted gp3, IMDSv2 required, automatic security updates. A public IPv4 address for outbound traffic only (cheaper than a NAT gateway); the security group has **no inbound rules**. Shell access through SSM Session Manager. |
| Containers | `cloudflared` and the PHP app container, run by Docker Compose and kept running by systemd. The app container runs the `prod` target of `backend/docker/Dockerfile`, built for ARM64 by the pipeline; see [Production image](#production-image). |
| Scheduled commands | A systemd timer runs the three hourly commands in order, in one-off containers of the deployed image; see [Scheduled commands](#scheduled-commands). |
| Database | RDS for PostgreSQL, see [Database](#database). |
| Email | Amazon SES in `eu-central-1` through the existing Mailer SMTP transport. Domain verified with SPF, DKIM, and DMARC. |
| Secrets | SSM Parameter Store SecureStrings under `/valutir/prod/` (free tier): the database password, `APP_SECRET`, newly generated JWT keys and passphrase, Stripe keys, the Turnstile secret, and the Tunnel token. The instance reads them at deploy time. |
| Images | An ECR repository, tagged by commit SHA, with a lifecycle rule keeping the last 10 images. |
| Logs | Container logs go to CloudWatch with **30-day retention**, as the Privacy policy promises. |
| Cost control | An AWS Budget with an alert at $40 a month. |

## Security, layer by layer

| Layer | Controls |
|---|---|
| AWS account | Root account with MFA, then left unused; a personal IAM Identity Center user for daily work; the budget alarm. |
| Network | No inbound rules on EC2. RDS has no public access, accepts connections only from the EC2 security group, and requires TLS. |
| Server | No SSH or key pair (SSM Session Manager instead); IMDSv2; encrypted disk; automatic security updates. |
| Permissions | Instance role: pull from ECR, read `/valutir/prod/*` parameters, write CloudWatch logs, send through SES. GitHub deploy role: usable only from this repository's `release` branch, and limited to pushing to ECR and sending the SSM deploy command. |
| Secrets | Only in SSM Parameter Store and in GitHub's encrypted secrets (the Cloudflare Pages token); never in images, git, or logs. |
| Application | Already in place: rate limits, login throttling, verified Stripe webhooks, the Stripe key-mode guard, CSP, email verification, and user-scoped queries. |

## Database

**Amazon RDS for PostgreSQL.** RDS is the managed service and PostgreSQL the engine: standard PostgreSQL that AWS installs, patches, backs up, and monitors. The existing Doctrine code and migrations run on it unchanged; only configuration changes:

- `DATABASE_URL` points at the RDS endpoint with `sslmode=verify-full`, and the image includes the RDS CA bundle.
- Migrations run as a normal database user; ValuTir needs no superuser and no extensions. A separate migration user and app user is optional hardening.
- The PostgreSQL major version matches local development (16 today).

Setup:

- `db.t4g.micro` (2 vCPU, 1 GB RAM): plenty for the expected early traffic, and resized later with a few minutes of downtime.
- Storage: 20 GB **gp2** while the account is on the free tier, because the RDS free tier covers only gp2; gp3 is billed even then. Once the free tier ends, change the storage type to gp3: same size, a little cheaper per GB, and the change is online, with no downtime and no data migration. In Terraform it's a one-line change (`storage_type`).
- Single-AZ, with no public access, encryption at rest, and TLS required.
- 7-day automated backups with point-in-time recovery, and deletion protection.
- Connections only from the EC2 security group.

Cost and free tier (Frankfurt, approximate; check the AWS pricing calculator):

| Period | Instance | Storage | Monthly |
|---|---|---|---|
| After the free tier | `db.t4g.micro`, ~$13 | 20 GB gp3, ~$3 (backups up to the database's size are free) | **~$16** |
| Free tier, accounts created **before 15 July 2025** (12 months from sign-up) | 750 hours a month of `db.t4g.micro` or `db.t3.micro`, Single-AZ | 20 GB of **gp2** storage and 20 GB of backups (gp3 isn't covered) | **~$0** with gp2 storage |
| Accounts created **after 15 July 2025** | Paid from the account's promotional credits instead of fixed free hours | Same | Covered while the credits last |

Check which free tier the account is on under Billing → Free Tier, and add a calendar reminder for its end date, so the storage moves to gp3 when it starts being billed.

Why `db.t4g.micro` rather than `db.t3.micro`: both are the same size (2 vCPU, 1 GB) and both are covered by the free tier, but `t4g` (ARM/Graviton) costs less once the free tier ends, so there's no switch to make after 12 months. The engine and the code don't care about the CPU type.

## Estimated monthly cost

Frankfurt, on-demand, approximate. Check the AWS pricing calculator; the free tier can cover RDS and part of EC2 at first.

| Item | Cost |
|---|---|
| EC2 `t4g.small` + 20 GB gp3 | ~$15.5 |
| Public IPv4 address | $3.65 |
| RDS for PostgreSQL `db.t4g.micro`, 20 GB, Single-AZ | ~$16 (~$0 during the free tier) |
| ECR, CloudWatch, SES, Parameter Store | ~$1–3 |
| Cloudflare (Pages, Tunnel, DNS, WAF) and GitHub Actions | $0 |
| **Total** | **~$36–39** (about $20–23 while RDS is on the free tier) |

## Deployment pipeline

1. `release` is a protected branch: merging needs a pull request and green required checks (backend and frontend CI).
2. Merging runs a `deploy-production` workflow on the merge commit:
   1. All tests again, on the exact merged code.
   2. Build the ARM64 backend image and push it to ECR, tagged with the commit SHA.
   3. Through SSM on the instance:
      - pull the image;
      - run Doctrine migrations (RDS backups allow point-in-time recovery);
      - restart the app container;
      - check `/health`. If the check fails, the previous image comes back automatically.
   4. Only once the backend is healthy, build the frontend with `VITE_API_URL=https://api.valutir.app` and deploy it to Cloudflare Pages with `wrangler`, so new UI never talks to an old API.
3. Credentials:
   - AWS through OIDC, with no stored keys.
   - Cloudflare through one GitHub secret, an API token limited to Pages.
   - ARM64 images build on GitHub's ARM runners, which are free for public repositories. For a private repository, use the included minutes or build with emulation.

## Infrastructure repository

The infrastructure lives in its own repository, `valutir-infra`, separate from this app repository. Private is recommended: GitHub Free allows private repositories, and since infrastructure changes are applied by hand, the missing branch protection on private repositories doesn't matter here.

| | `valutir-infra` (infrastructure) | `valutir` (this repo, the app) |
|---|---|---|
| Contents | Terraform: VPC, EC2, RDS, IAM (instance role, GitHub OIDC deploy role), ECR, the SSM parameter slots, CloudWatch log group, budget. The instance's setup: Docker, `cloudflared`, the Compose file and systemd units that run the app container and the hourly timer, and the deploy script installed on the instance | The application, its Dockerfile (`dev` and `prod` targets), tests, and the `deploy-production` workflow |
| Changes applied | **By hand:** `terraform plan`, then `terraform apply` from your machine (a workflow with manual approval can come later). Never by the app pipeline | Automatically on merge to `release` |
| State | S3 bucket (see the decision log) | none |
| Secrets | None in code or state values you type in: Terraform creates the parameter slots, and secret values are set in SSM Parameter Store separately. `*.tfvars` and `.terraform/` are git-ignored; the AWS account ID is a variable, not hard-coded | GitHub secrets: only the Cloudflare Pages token |

How the two connect, with no shared code:

- **Terraform outputs → app repository variables.** After `terraform apply`, copy the outputs into this repo's GitHub variables: the ECR repository URL, the deploy role ARN, and the EC2 instance ID. These aren't secrets.
- **Deploy contract.** The app pipeline pushes the image to ECR, then sends one SSM command to the instance, `/opt/valutir/deploy.sh <image tag>`. That script, owned by `valutir-infra`, pulls the image, runs migrations, restarts the container, checks `/health`, and rolls back if the check fails.
- **New settings.** When the app needs a new environment variable or secret, the change is in both repos: `valutir-infra` adds the parameter slot and passes it to the container, and this repo uses it. Apply the infrastructure change first, then merge the app change.

## MVP mode: production acts as staging until launch

- **Stripe:** sandbox keys in production (`STRIPE_MODE=test` with `APP_ENV=prod`, which the key policy allows). Testers pay with `4242 4242 4242 4242`, and nobody can be charged. Switch to live keys at launch (go-live checklist).
- **SES:** sandbox at first, delivering only to verified addresses. Fine for a few testers; request production access before inviting more.
- **Search engines:** `noindex` until launch.

## Who does what

- **In this repository:**
  - the production Dockerfile (**done**);
  - the `deploy-production` GitHub workflow (not started);
  - a deployment runbook (not started).
- **In `valutir-infra`** (not started; the repository doesn't exist yet):
  - Terraform for the VPC, EC2, RDS, IAM and OIDC, ECR, the parameter slots, logs, and the budget;
  - the instance setup: Docker, `cloudflared`, the Compose file and systemd units, and `/opt/valutir/deploy.sh` with health check and rollback.
- **Done by hand:**
  - GitHub: create the private `valutir-infra` repository;
  - AWS account: root MFA and an Identity Center user, then `terraform apply` from `valutir-infra`;
  - AWS: the secret values in SSM Parameter Store;
  - Cloudflare: Tunnel token, Pages project, API token, and WAF rules;
  - SES domain verification;
  - GitHub, this repository: branch protection on `release`, the Cloudflare secret, and the Terraform outputs as repository variables.

## Open questions

None at the moment. Every decision above is made. Next: create `valutir-infra` (Terraform and the instance setup), then this repository's `deploy-production` workflow.
