# Cloudflare hosting and proxies

How the frontend is hosted on Cloudflare, how the API sees real client IPs behind proxies, and the Cloudflare steps left for deployment. The overall design is in [architecture.md](architecture.md).

## Frontend hosting

The frontend is a static build hosted on Cloudflare (Pages, or Workers with static assets) on the app's domain; the API and database run on AWS.

- Build command `npm run build`, output folder `frontend/dist`, Node 20. Set `VITE_API_URL` and `VITE_TURNSTILE_SITE_KEY` as build variables.
- The build writes `dist/_headers` (`frontend/build/securityHeaders.ts`): a Content Security Policy whose `connect-src` is the origin of `VITE_API_URL`, plus `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and long-lived caching for the hashed files in `/assets`. Add any new external script, frame, font, image, or API origin to that policy.
- SPA routing: Pages serves `index.html` for unknown paths when there's no `404.html`; on Workers set `not_found_handling = "single-page-application"`.
- `FRONTEND_URL` (backend) must be the app's one canonical origin: redirect `www` to it (or the reverse) with a Cloudflare redirect rule. Preview deployments (`*.pages.dev`) aren't allowed by the API's CORS.

## Client IPs behind proxies

Rate limits (registration, password reset, contact, email-change confirmation, email verification links), login throttling, and the Turnstile check all use the client's IP. Behind a proxy PHP only sees the proxy's address, so without configuration every visitor shares one IP: a few sign-ups would block registration for everyone, and about 25 failed logins would lock everyone out.

Symfony reads the visitor's IP and scheme from `X-Forwarded-For` / `-Proto` / `-Port`, but only when the request comes from an address in `SYMFONY_TRUSTED_PROXIES` (`config/packages/framework.yaml`). It walks the `X-Forwarded-For` list from the right, skipping trusted proxies, so a header forged by the client is ignored. Unset, nothing is trusted (local development). Set it to every proxy hop in front of PHP, whatever the final setup is:

| Setup | `SYMFONY_TRUSTED_PROXIES` |
|---|---|
| Cloudflare (proxied DNS) → AWS load balancer → PHP | The VPC range of the load balancer (or `PRIVATE_SUBNETS`) plus Cloudflare's IP ranges ([cloudflare.com/ips](https://www.cloudflare.com/ips/)), comma-separated |
| Cloudflare Tunnel (`cloudflared` next to PHP) → PHP | The `cloudflared` address (or `PRIVATE_SUBNETS` if only it can reach PHP) |
| Cloudflare → PHP directly | Cloudflare's IP ranges |

Check after deploying: the client IP logged for a request (or a rate-limit hit from two networks) must differ per visitor, not be the proxy's address. Cloudflare's ranges change rarely; update the variable when they do.

## Still to do when deploying

The complete pre-production list, including Stripe and what the architecture must provide for it, is the [go-live checklist](go-live-checklist.md).

1. Proxy the API hostname through Cloudflare with SSL mode Full (strict), allow only Cloudflare's IP ranges on the AWS load balancer, and add `X-Content-Type-Options: nosniff`, `Content-Security-Policy: frame-ancestors 'none'`, and `Cache-Control: no-store` to API responses with a Response Header Transform Rule.
2. Make sure the API can only be reached through your own Cloudflare zone. Cloudflare's IP ranges are shared by every Cloudflare customer, so an IP allow-list alone lets anyone route requests to the origin through their own zone or Worker and skip your WAF and edge rules. Prefer a Cloudflare Tunnel (`cloudflared` next to PHP, no public ingress on the load balancer); otherwise turn on Authenticated Origin Pulls with your own certificate (zone-specific mTLS, checked at the load balancer or nginx). Also add a WAF rule on the API hostname that blocks everything except `/api/*` and `/health`, and a skip rule so Bot Fight Mode, managed challenges, and tight rate limits never apply to `/api/billing/webhook`: Stripe can't solve a challenge, and blocked webhooks mean paid accounts stay locked. (Cloudflare Access isn't a fit: it's a login gate for internal apps, not for a public API.)
3. The CSP ships as `Content-Security-Policy-Report-Only`. Click through the deployed app (sign-in, Turnstile on the contact page, calendar), fix what the browser console reports, then set `ENFORCE_CSP = true`.
4. Turn on HSTS in the Cloudflare dashboard (SSL/TLS > Edge Certificates) with a short `max-age` once the app and API both work over HTTPS; raise it, and consider `includeSubDomains`, once it's stable.
