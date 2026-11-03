# Payments

The paid plan is a **one-time unlock: €19.99, VAT included, no renewal**. It lifts the free plan's limit of 50 active (active or trial) subscriptions. Payment runs on Stripe-hosted Checkout, so card details never reach ValuTir.

How it works:

1. `POST /api/billing/checkout` (signed in) creates a Checkout session. The product, amount, currency, and buyer all come from the server (`App\Payment\UnlockOffer`); the request has no body. Any earlier open session of the same user is expired first, so only one can be paid. A `purchase` row records the session (status `pending`). Rate limit: 10 attempts per hour per user.
2. The browser goes to the returned URL. The frontend only follows URLs on `https://checkout.stripe.com`.
3. Stripe calls `POST /api/billing/webhook`. The request must carry a valid `Stripe-Signature` (an HMAC of the raw body under `STRIPE_WEBHOOK_SECRET`, at most 5 minutes old), or it gets a 400. Only this webhook unlocks an account, and only for a session the server created whose mode, amount, currency, product, and buyer match the `purchase` row. Being redirected back to `/plans?checkout=success` proves nothing; the page polls `GET /api/billing` until the webhook has landed.
4. Handled events: `checkout.session.completed`, `checkout.session.async_payment_succeeded` / `_failed`, `checkout.session.expired`, `charge.refunded` (a full refund revokes the unlock; a partial one keeps it), and `charge.dispute.created` (revokes it). Events are applied idempotently on a locked row, in any order and any number of times; other event types get a 200 and are ignored.
5. The free limit is enforced in `App\Payment\FreePlanLimit`. Creating a 51st active subscription, or re-activating a cancelled one at the limit, returns 402; existing records stay readable and editable. The count runs with the user's row locked, so parallel requests can't pass it.

Tax: with `STRIPE_AUTOMATIC_TAX=1` Checkout uses Stripe Tax on the tax-inclusive price, requires a billing address (VAT location evidence), and accepts a VAT ID (EU business reverse charge). Before going live, set up Stripe Tax in the Dashboard: your origin address, the registrations you hold (e.g. Romania, plus EU OSS once you're over the threshold), and a default product tax code for SaaS. Check the setup with your accountant.

## Stripe keys and modes

Stripe keeps a separate test environment (a *sandbox*, called "test mode" in older docs). Test keys (`sk_test_…`, `rk_test_…`) never move money, and a real card is declined there, so a demo can't charge anyone. Live keys (`sk_live_…`, `rk_live_…`) charge real cards.

`STRIPE_MODE` says which of the two a deployment is for, and `App\Payment\StripeKeyPolicy` checks the key against it before anything is sent to Stripe:

| Deployment | `APP_ENV` | `STRIPE_MODE` | Allowed key |
|---|---|---|---|
| Laptop, CI | `dev` / `test` | `test` (default) | `sk_test_` / `rk_test_` |
| Staging / demo server | `prod` | `test` | `sk_test_` / `rk_test_` |
| Production | `prod` | `live` | `sk_live_` / `rk_live_` |

Anything else turns checkout off: a live key with `STRIPE_MODE=test`, `STRIPE_MODE=live` outside `APP_ENV=prod`, a test key in live mode, or a publishable `pk_` key. The Plans page then says payments are unavailable, `POST /api/billing/checkout` returns 503, and the log line "Stripe Checkout is turned off." gives the reason without the key. The webhook signing secret (`whsec_…`) doesn't show its mode, so take it from the same environment as the key: from `stripe listen` locally, from the test-mode webhook endpoint on staging, and from the live one in production.

## Testing payments locally

Use **test-mode keys only** (`sk_test_…`) and leave `STRIPE_MODE=test`; test mode never moves money.

1. In the Stripe Dashboard (test mode), copy the secret key from Developers → API keys. Put it in `backend/.env` as `STRIPE_SECRET_KEY`. Turn on Stripe Tax in test mode, or set `STRIPE_AUTOMATIC_TAX=0`.
2. Get the local webhook signing secret and put it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`. It stays the same for your key, so you only do this once:

   ```bash
   docker compose --profile stripe run --rm stripe-cli listen --print-secret
   ```

3. Recreate the backend so it picks up the variables, apply the migrations, and start the webhook forwarder:

   ```bash
   docker compose up -d backend
   docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
   docker compose --profile stripe up -d stripe-cli
   docker compose logs -f stripe-cli    # shows every forwarded event and the backend's response code
   ```

   Without Docker, `stripe login` then `stripe listen --forward-to localhost:8080/api/billing/webhook` with the Stripe CLI works the same.
4. Sign in at `http://localhost:5173`, open **Plans**, and pay. Test cards (any future expiry, any CVC, any postcode):

   | Card | Result |
   |---|---|
   | `4242 4242 4242 4242` | Paid: the page confirms and the account is unlocked |
   | `4000 0025 0000 3155` | 3-D Secure challenge, then paid |
   | `4000 0000 0000 9995` | Declined (insufficient funds): stays on the free plan |

   With SEPA Direct Debit enabled in test mode, the test IBAN `DE89370400440532013000` succeeds after a short delay (the `async_payment_succeeded` path).
5. Refund or dispute: refund the payment in the Dashboard (Payments → the payment → Refund), and the account goes back to the free plan. For a dispute, pay with `4000 0000 0000 0259`.
6. Check the result: `GET /api/billing` returns `"unlocked": true`, and the `purchase` row has status `paid`. `stripe trigger checkout.session.completed` creates sessions the server didn't make, so they're logged as unknown and ignored, which is expected.

## Going live

Tick off the [go-live checklist](go-live-checklist.md) first. It covers code blockers, Stripe account settings, infrastructure, and what the production architecture must provide for Stripe. The short version:

- Create a webhook endpoint in the Dashboard (live mode) for `https://<api-host>/api/billing/webhook` with exactly the six events above. Set `STRIPE_MODE=live`, its signing secret as `STRIPE_WEBHOOK_SECRET`, and a **restricted live key** (`rk_live_…`) as `STRIPE_SECRET_KEY`. Keep the secrets in deployment secrets, never in git. The restricted key needs Checkout Sessions write access, plus Customers write access when Stripe Tax is on.
- Activate the account, finish Stripe Tax, and enable the payment methods you want (Checkout shows the ones turned on in the Dashboard).
- A webhook that fails returns 500, and Stripe retries it for up to three days. Alarm on repeated "Rejected Stripe webhook." or "Stripe session does not match its purchase" log lines.
