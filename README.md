# ValuTir - Developer Guide
Subscriptions handling app
Tracks user-declared or transaction-observed subscriptions

## Notes
> cp backend/.env.example backend/.env
- then fill in DB_PASSWORD, JWT_PASSPHRASE, APP_SECRET

> cp frontend/.env.example frontend/.env
- then adjust VITE_API_URL if needed
VITE_API_URL=http://localhost:8080

## RUN PHPUnit tests:
> docker compose exec backend php vendor/bin/phpunit tests/Controller/HealthcheckControllerTest.php

## FE:
### npm install locally
>npm install

[//]: # (## Attach and Run Dev Manually)

[//]: # (>docker compose exec frontend /bin/sh)

[//]: # ( )
[//]: # (Inside container:)

[//]: # (>npm run dev)

Output appears in your terminal 
Open http://localhost:5173 in browser

## Project Structure

```
valutir/
├── docker-compose.yml                 # Root compose (includes backend + frontend)
├── backend/
│   ├── docker-compose.yml             # Backend services (db + backend)
│   ├── docker-compose.override.yml    # Dev overrides (bind mounts)
│   ├── .env                           # Environment variables
│   ├── .dockerignore                  # Exclude from Docker context
│   └── docker/
│       └── Dockerfile                 # Backend multi-stage Dockerfile
└── frontend/
    ├── docker-compose.yml             # Frontend service
    ├── .env                           # Environment variables
    ├── .dockerignore                  # Exclude from Docker context
    └── docker/
        ├── Dockerfile                 # Frontend multi-stage Dockerfile
        └── nginx.conf                 # Nginx config for production
```

## Quick Start

### 1. Start development stack

From the root (`valutir/`) directory:

```bash
docker compose up -d --build
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Backend** on `localhost:8080` (PHP development server)
- **Frontend** on `localhost:3000` (Vite dev server)

### 2. Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### 3. Check MailDev
- Mails: http://localhost:1080 — you should see the MailDev inbox for all emails sent during development.

### 4. Inspect logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### 5. Down / Rebuild / Stale cache

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

## Extra notes:
AWS Deployment (Low-Cost, Closed)
For a "only I know the link" setup at near-zero cost:

Component	Service	Est. cost
Compute	1× t4g.micro EC2 (ARM, free tier eligible)	~$0–6/mo
Database	RDS PostgreSQL t4g.micro or just Postgres in Docker on same EC2	$0 if self-hosted
HTTPS + obscure URL	Nginx reverse proxy + a long random subdomain via Route 53 or a free subdomain	~$0.50/mo
Container registry	ECR (500 MB free)	$0
Secret URL	A UUID-style path prefix (e.g., /vt-a9f3b2c1/) acts as a lightweight token	$0
The cheapest viable setup: one t4g.micro EC2, docker compose up -d on it, Nginx in the compose stack on port 443 with a self-signed cert or a free Let's Encrypt cert (Certbot in the compose stack). Your secret "only I know" link is just the EC2's elastic IP plus a random long path — no auth needed at the network level since the API is already JWT-protected.

What to Build First (Suggested Sprint Order)
Repo + Docker Compose boots locally — all 3 containers green

Backend: User entity → JWT login endpoint → /api/me protected route

Backend: Subscription CRUD endpoints + ValueScoreService

Frontend: MUI theme + login screen → JWT storage → protected route guard

Frontend: Subscription list + add/edit modal + dashboard totals

CI: Both GitHub Actions workflows passing on push

Deploy: EC2 + docker compose + Nginx + secret URL

# Other notes:
+If your app is a subscription tracker, you usually cannot automatically verify that a user has an active 
Google One, Netflix, gym, or SaaS subscription through those providers directly. In practice, users track 
subscriptions in your app through three workable inputs: manual entry, email/receipt import, 
or bank/transaction sync with recurring-payment detection; then your app normalizes those into 
monthly/yearly totals and possible savings suggestions.

+User experience - clean UX:

- User creates a free account.
- App offers: “Add subscription manually” or “Connect bank.”
- User enters service name, price, cadence, renewal date, category, and optional notes; or your app auto-suggests recurring charges from transactions.
- App converts everything to a normalized monthly cost and annual cost.
- App flags duplicates, price increases, infrequent usage, or annual-vs-monthly savings opportunities when enough evidence exists.

+Data model
A good internal record is “subscription observed.”

Suggested model:

user_id

service_name

provider_group (google, apple, netflix, gym, other)

category (cloud, streaming, fitness, software, utilities)

price_amount

price_currency

billing_interval (monthly, yearly, weekly, quarterly)

normalized_monthly_amount

normalized_yearly_amount

renewal_date

payment_source (manual, bank_detected, email_parsed)

confidence_score

merchant_name_raw

status (active, suspected, canceled, expired)

household_shared (boolean)

usage_score or last_confirmed_at


+For totals, your app simply normalizes:

Monthly plan: monthly = price, yearly = price × 12.

Yearly plan: monthly = price ÷ 12, yearly = price.

Quarterly plan: monthly = price ÷ 3, yearly = price × 4.


+Savings logic
Potential savings should be framed as estimates, not promises, unless you have strong evidence. The safest rules are:

Detect duplicate services in the same category, like Spotify + YouTube Music, or multiple cloud storage plans.

Suggest annual instead of monthly only when the annual public price is known and lower on an equivalent plan.

Flag “unused” only if the user marks low usage manually, or if recurring payments continue but they haven’t confirmed value recently.
