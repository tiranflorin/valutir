# ValuTir - Developer Guide
Subscriptions handling app

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

### 3. Inspect logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### 4. Down / Rebuild / Stale cache

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
