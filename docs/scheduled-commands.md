# Scheduled commands

Three console commands run on a schedule. `backend/bin/scheduled-run` runs them in the required order, and it's the one definition for every environment: a systemd timer runs it hourly in production, and a Compose service runs it in a loop locally (both below). A failing step stops the rest and the script exits non-zero; the next run retries.

1. `app:subscriptions:advance-billing-dates`
2. `app:reminders:send`
3. `cache:pool:prune`

The first two are safe to run at any time and repeatedly, and both take `--dry-run` (show what would happen) and `--user=EMAIL` (one user only), for example `docker compose exec backend php bin/console app:reminders:send --dry-run --user=you@example.test`.

- `app:subscriptions:advance-billing-dates` first makes paused subscriptions active again on their `resumesOn` day (a free account at its free-plan limit keeps the subscription paused, retried next run), then moves a past `nextBillingDate` of an auto-renewing subscription to its next charge on or after the owner's local today, and turns a trial whose end date has passed into an active subscription. Paused, cancelled, deleted, and non-renewing subscriptions are left alone.
- `app:reminders:send` emails each user (with reminders on and a verified email address) a digest of upcoming payments (a subscription flagged for review also gets a line with the flag date, the user's note and a link to decide on its page), on the first run after 01:00 in their time zone; later runs that day skip them. No email goes out on a day with nothing new to remind, and a charge is reminded once, from its lead time until the charge day:

  | Reminder | Sent |
  |---|---|
  | Trial ending | 2 days before the trial ends |
  | Renewal, weekly | 1 day before |
  | Renewal, monthly | 3 days before |
  | Renewal, quarterly or yearly | 7 days before |

  With paid features (the unlock or an admin account), each subscription can set its own time instead ("Remind me" in the form, `reminderLeadDays`, 1 to 30 days), for a trial too. Without them the defaults apply, even if a choice was stored earlier. Changing it never sends a charge's reminder twice; a longer time that already includes today sends it on the next run.

  It exits with a failure status when a digest can't be sent; that user is retried on the next run.
- `cache:pool:prune` removes expired rows from the PostgreSQL-backed cache pools (revoked JWTs and rate-limit counters, table `cache_items`). Expired rows are already ignored, so this only keeps the table small.

Charge dates are counted from the stored date: monthly from 31 Jan gives 28 Feb, then 31 Mar (the calendar uses the same rule). Each user's time zone is set in Preferences and defaults to `Europe/Berlin` (Frankfurt, AWS eu-central-1). Servers and the database stay on UTC. Users turn reminders off in Preferences or with the one-click link in every reminder email.

## Locally

The `scheduler` service in `backend/docker-compose.yml` starts with `docker compose up -d`. It uses the dev image, your mounted code and the backend's settings, and runs `bin/scheduled-run` every `SCHEDULER_INTERVAL` seconds (default 300; set it in `backend/.env`). Emails go to MailDev at http://localhost:1080. A failed run is logged and retried on the next loop.

```bash
docker compose logs -f scheduler                 # watch the runs
docker compose exec backend bin/scheduled-run    # one run now, without waiting
docker compose stop scheduler                    # pause it (docker compose start scheduler to resume)
```

A shorter interval doesn't send more email: each user gets one digest per local day, and each charge is reminded once. To get a new digest for a test account after changing its subscriptions, clear that day's run and its sent reminders, then run once:

```bash
docker compose exec db psql -U valutir -d valutir -c "
  UPDATE \"user\" SET reminders_processed_on = NULL WHERE email = 'you@example.test';
  DELETE FROM reminder_log WHERE subscription_id IN
    (SELECT s.id FROM subscription s JOIN \"user\" u ON u.id = s.user_id WHERE u.email = 'you@example.test');"
docker compose exec backend bin/scheduled-run
```

This is for local test data only. In production it would send real users a second email.

## In production

Each run is a separate, short-lived container of the deployed image with the API's own settings (`/opt/valutir/app.env`). It talks to RDS and SES directly and exits; the running API container isn't involved, so a run works while the API restarts during a deploy. `docker compose run` uses the image of the `valutir-api` service, so pin that to the deployed tag through a variable the deploy writes (for example `image: ${ECR_IMAGE}:${VALUTIR_TAG}`), and every run uses the current release.

It needs the API's settings: `DATABASE_URL`, `MAILER_DSN` (Amazon SES SMTP, `smtp://<ses-smtp-user>:<ses-smtp-password>@email-smtp.eu-central-1.amazonaws.com:587`, with the credentials as SSM SecureStrings), `FRONTEND_URL` (links in emails) and `DEFAULT_URI` (the one-click unsubscribe header). Until SES production access is granted, SES delivers only to addresses verified in SES.

The units, installed by `valutir-infra`'s instance setup:

```ini
# /etc/systemd/system/valutir-scheduled.service
[Unit]
Description=ValuTir scheduled commands
Requires=docker.service
After=docker.service
# OnFailure=...   how a failed run raises an alert is still open (TODO #2 in status-and-todo.md)

[Service]
Type=oneshot
ExecStart=/usr/bin/docker compose -f /opt/valutir/compose.yaml run --rm --no-deps valutir-api bin/scheduled-run
TimeoutStartSec=30min
```

```ini
# /etc/systemd/system/valutir-scheduled.timer
[Unit]
Description=Run the ValuTir scheduled commands hourly

[Timer]
OnCalendar=hourly
# A run missed while the instance was down happens at boot.
Persistent=true

[Install]
WantedBy=timers.target
```

systemd never starts the service again while a run is still going, so runs can't overlap. Install and check:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now valutir-scheduled.timer
systemctl list-timers valutir-scheduled.timer        # next and last run
sudo systemctl start valutir-scheduled.service       # one run now
systemctl status valutir-scheduled.service           # whether the last run succeeded
journalctl -u valutir-scheduled.service -n 50        # what it printed
```

| | Production | Locally |
|---|---|---|
| Trigger | systemd timer, hourly, catches up after downtime | `scheduler` service loop, every `SCHEDULER_INTERVAL` seconds |
| Container | one-off `docker compose run --rm` of the deployed prod image | dev image with your code mounted |
| Mail | Amazon SES | MailDev |
| A failed run | the unit is marked failed (alert still to decide) | logged in `docker compose logs scheduler` |
