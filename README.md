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

# TESTING:

## FE:
Use this flow:
Start frontend container.
Run 
>docker compose exec frontend npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

Add the Vitest config and test files.
Run tests with
> docker compose exec frontend npm run test:run

That keeps your entire frontend toolchain consistent inside Docker, which is exactly what you want for CI parity.

Calendar:

Great — this is a real milestone. The screenshot shows the month grid is rendering correctly, events are placed on the right dates, toolbar navigation is visible, and the page is already integrated into your app shell/header. That means the calendar engine, fetch flow, recurrence mapping, and event rendering baseline are now working.

Next priorities
Based on the current UI, the best next steps are:

Make the page match the rest of ValuTir visually.

Improve event interaction and details.

Add filtering and alternate views.

Then polish mobile and loading/empty states.

Right now the page is functional, but it still looks like a raw FullCalendar embed instead of a first-class ValuTir screen. The screenshot shows the main layout is still very plain, with the details section disconnected below the calendar and event pills using default FullCalendar styling.

Step 1: match app styling
Your immediate next task should be a layout/styling pass so the page feels like SubscriptionDetailPage, which already uses AppHeader, AppShell, MUI cards, spacing, and stronger structure. The current calendar screen has the right shell but not yet the same component polish.

What to change next
Replace the raw details block with a card-like panel using MUI Paper or Card.

Put the calendar and selected-date details in a two-column layout on desktop.

Remove the debug section from the main UI.

Style event pills with your status colors instead of FullCalendar default blue.

Make the toolbar look like the rest of the app, using MUI buttons or ButtonGroup.

Recommended file updates
You likely already have:

src/pages/CalendarPage.tsx

src/components/calendar/SubscriptionCalendar.tsx

src/components/calendar/CalendarToolbar.tsx

src/components/calendar/CalendarDayDetails.tsx

Now update those rather than adding new files immediately.

Step 2: improve interaction
Your current screenshot still shows “Select a date,” which means the page is waiting for date clicks to reveal useful details. That’s okay for MVP, but the next UX upgrade is to make event clicks more valuable.

Do this next
On eventClick, open the subscription detail page for that item.

On dateClick, populate the side details panel with all subscriptions due that day.

Highlight the selected date visually in the details panel title.

Show more metadata in each event detail card: category, cadence, payment method, notes if relevant.

Since you already have SubscriptionDetailPage.tsx, the most natural next interaction is:

ts
navigate(`/subscriptions/${subscriptionId}`);
or whatever your existing detail route is in App.tsx. Your app already has a subscription detail route pattern, so reusing it will make the calendar feel connected rather than isolated.

Step 3: filters
This is the most valuable product feature after the base month grid. Your backend data includes fields like billingCadence, category, paymentMethod, status, and isActive, which are ideal filter inputs for a subscription calendar.

Add next
Create:

text
src/components/calendar/CalendarFiltersBar.tsx
Start with these filters:

Billing cadence

Category

Status

Active only

Then filter the subscriptions list before passing it into useCalendarEvents.

Suggested order
Status filter

Category filter

Cadence filter

Active-only toggle

This will immediately make the calendar more useful than a static overview.

Step 4: week/day/agenda views
After filters, add alternate views. FullCalendar supports this cleanly through plugins and changeView(), and it is the next logical feature after month view is stable.

Install next
bash
npm install @fullcalendar/timegrid @fullcalendar/list
Then update
SubscriptionCalendar.tsx

CalendarToolbar.tsx

Add view buttons:

Month

Week

Day

Agenda

Map them to:

dayGridMonth

timeGridWeek

timeGridDay

listMonth

That gives you the “monthly overview + closer inspection + agenda” model you originally wanted. FullCalendar’s plugin system is designed for switching between these standard views.

Step 5: timeline section
After alternate views, add a custom “Upcoming 30 days” block below or beside the calendar. This is especially important for ValuTir because subscription products are more about upcoming cash flow than meeting-style scheduling. Your earlier goal explicitly mentioned a timeline for the next 30/60/90 days, and a custom component will fit that use case better than relying only on generic calendar views.

Add file
text
src/components/calendar/UpcomingTimeline.tsx
Show
date

service name

amount

currency

category

status badge

This should probably sit below the grid first, then later move into a tabbed secondary panel if needed.

Step 6: page polish
After features, finish with the product-level polish items:

Skeleton while subscriptions load

Empty state when no subscriptions match filters

Better event chips with status colors

Mobile stacked layout

Right-side drawer or bottom sheet for selected-date details

Remove developer debug text from the page

The screenshot makes it clear the page works but still has “builder state” artifacts, especially the debug labels and default event style. That’s normal at this stage; now you move into refinement.

Best next implementation order
Here is the order I recommend from this point:

Restyle layout to match ValuTir.

Make eventClick open subscription details.

Improve CalendarDayDetails card content.

Add CalendarFiltersBar.

Add week/day/agenda views.

Add UpcomingTimeline.

Add skeleton, empty state, and mobile drawer.

Very next concrete task
If you want the best immediate improvement, do this next:

convert the page into a desktop two-column layout

make CalendarDayDetails a MUI card

wire eventClick to navigate to SubscriptionDetailPage

remove the debug block

That will give you the biggest visible product jump with the smallest engineering effort, and it will align the screen more closely with the style and behavior of your existing detail pages.

If you want, I can now give you the next full file changes for exactly that step:

visual alignment with ValuTir

event click -> detail page navigation

improved selected-date details card

removal of debug UI

import useCalendarEvents from '../hooks/useCalendarEvents';

## BE:
TODO
