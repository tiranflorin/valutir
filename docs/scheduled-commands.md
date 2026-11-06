# Scheduled commands

Two console commands keep billing data current and send payment reminders. In production, a systemd timer on the instance runs them, and the cache prune below, every hour in one-off containers of the deployed image ([architecture.md](architecture.md#scheduled-commands)). The examples here are for local development. Both are safe to run at any time and repeatedly, and both take `--dry-run` (show what would happen) and `--user=EMAIL` (one user only). Run them **hourly, in this order**:

```bash
docker compose exec backend php bin/console app:subscriptions:advance-billing-dates
docker compose exec backend php bin/console app:reminders:send
```

- `app:subscriptions:advance-billing-dates` first makes paused subscriptions active again on their `resumesOn` day (a free account at its 50-subscription limit keeps the subscription paused, retried next run), then moves a past `nextBillingDate` of an auto-renewing subscription to its next charge on or after the owner's local today, and turns a trial whose end date has passed into an active subscription. Paused, cancelled, deleted, and non-renewing subscriptions are left alone.
- `app:reminders:send` emails each user (with reminders on and a verified email address) a digest of upcoming payments, on the first run after 01:00 in their time zone; later runs that day skip them. No email goes out on a day with nothing new to remind, and a charge is reminded once, from its lead time until the charge day:

  | Reminder | Sent |
  |---|---|
  | Trial ending | 2 days before the trial ends |
  | Renewal, weekly | 1 day before |
  | Renewal, monthly | 3 days before |
  | Renewal, quarterly or yearly | 7 days before |

  It exits with a failure status when a digest can't be sent; that user is retried on the next run.

A third command removes expired rows from the PostgreSQL-backed cache pools (revoked JWTs and rate-limit counters, table `cache_items`). Expired rows are already ignored, so this only keeps the table small; run it hourly too, in any order:

```bash
docker compose exec backend php bin/console cache:pool:prune
```

Charge dates are counted from the stored date: monthly from 31 Jan gives 28 Feb, then 31 Mar (the calendar uses the same rule). Each user's time zone is set in Preferences and defaults to `Europe/Berlin` (Frankfurt, AWS eu-central-1). Servers and the database stay on UTC. Users turn reminders off in Preferences or with the one-click link in every reminder email.
