# API

Send `Authorization: Bearer <token>` with authenticated requests. Errors are always JSON; validation failures return 422 with per-field `errors`.

- **Public:** `POST /api/register`, `POST /api/register/verify-email` (link token), `POST /api/login_check`, `POST /api/contact`, `POST /api/reset-password/request`, `POST /api/reset-password/new`, `POST /api/profile/email/confirm` (link token), `POST /api/reminders/unsubscribe` (signed link token), `POST /api/billing/webhook` (Stripe-signed), and `GET /health`.
- **Account (authenticated):** `GET`/`PATCH`/`DELETE /api/profile`, `PATCH /api/profile/password`, `POST /api/profile/email`, `POST /api/profile/email/verification` (resend the confirmation link), `GET /api/profile/export` (all of the user's data as a JSON download), `GET /api/profile/export/subscriptions.csv` (current subscriptions as CSV; optional `?view=personal|business`), `POST /api/logout`, `POST /api/logout/all`.
- **Billing (authenticated):** `GET /api/billing` (plan, price, active-subscription usage), `POST /api/billing/checkout` (returns a Stripe Checkout URL).
- **Subscriptions (authenticated, owner only):** `GET`/`POST /api/subs`, `GET`/`PUT`/`PATCH`/`DELETE /api/subs/{id}`. Updates replace every field, so send the full subscription.

The full endpoint table with request details is in [AGENTS.md](../AGENTS.md#api-endpoints).

Notes:
- Password reset, email-change, and email-verification links use random single-use tokens; only their SHA-256 hash is stored. Reset links expire after one hour, email-change and verification links after 24 hours.
- "Download my data" (`/api/profile/export*`) is built on request and never stored: no password hash, token data, token hashes or Stripe IDs; `Cache-Control: no-store`; 10 downloads per hour per user (JSON and CSV together). CSV cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return get a leading `'` so spreadsheets don't run them as formulas, and the file starts with a UTF-8 byte order mark for Excel. CORS exposes `Content-Disposition` so the app can use the suggested file name.
- Registration, password reset, contact, email confirmation and verification (opening a link: 10 per 15 minutes per IP; resending: 3 per hour per user), and password-checking account actions are rate limited.
- The contact form verifies the Turnstile token with Cloudflare server-side and sends the message to `CONTACT_RECIPIENT`, with the sender as Reply-To. Keep the Turnstile secret out of Vite variables.
