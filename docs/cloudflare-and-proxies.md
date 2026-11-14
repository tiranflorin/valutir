# Cloudflare hosting and proxies

How the frontend is hosted on Cloudflare, how the API sees real client IPs behind proxies, and the Cloudflare steps left for deployment. The overall design is in [architecture.md](architecture.md).

## Frontend hosting

The frontend is a static build hosted on Cloudflare Pages on the app's domain; the API and database run on AWS.

- The deploy pipeline builds it, not Cloudflare: `npm run build` on Node 24 in GitHub Actions, with `VITE_API_URL` and `VITE_TURNSTILE_SITE_KEY` set by the workflow, then `wrangler pages deploy frontend/dist`. Cloudflare's own Git integration and build settings stay unused ([architecture.md](architecture.md#deployment-pipeline)).
- The build writes `dist/_headers` (`frontend/build/securityHeaders.ts`): a Content Security Policy whose `connect-src` is the origin of `VITE_API_URL`, plus `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and long-lived caching for the hashed files in `/assets`. Add any new external script, frame, font, image, or API origin to that policy.
- Routing: the build prerenders each public page to its own file (`dist/plans.html` is served at `/plans`) and writes an empty `noindex` page for each signed-in and token route. Any other path gets `dist/404.html` with status 404; it is the same app shell, so React Router still opens `/subscriptions/12` in a browser. See [seo.md](seo.md).
- `FRONTEND_URL` (backend) must be the app's one canonical origin: redirect `www` to it (or the reverse) with a Cloudflare redirect rule. Preview deployments (`*.pages.dev`) aren't allowed by the API's CORS.

## Client IPs behind proxies

Rate limits (registration, password reset, contact, email-change confirmation, email verification links), login throttling, and the Turnstile check all use the client's IP. Behind a proxy PHP only sees the proxy's address, so without configuration every visitor shares one IP: a few sign-ups would block registration for everyone, and about 25 failed logins would lock everyone out.

Symfony reads the visitor's IP and scheme from `X-Forwarded-For` / `-Proto` / `-Port`, but only when the request comes from an address in `SYMFONY_TRUSTED_PROXIES` (`config/packages/framework.yaml`). It walks the `X-Forwarded-For` list from the right, skipping trusted proxies, so a header forged by the client is ignored. Unset, nothing is trusted (local development).

In production the path is Cloudflare's edge → Cloudflare Tunnel → `cloudflared` → PHP, with no load balancer ([architecture.md](architecture.md)). PHP sees every request coming from the `cloudflared` container's address on the Compose network, with the visitor's IP in `X-Forwarded-For`, set by Cloudflare's edge. So set `SYMFONY_TRUSTED_PROXIES` to that network's subnet, fixed in the Compose file in `valutir-infra` (for example `172.30.0.0/24`). That's safe because nothing else can reach PHP: port 8080 isn't published on the host and the instance has no inbound rules. `PRIVATE_SUBNETS` would also work, but it trusts more than needed.

Check after deploying: the client IP logged for a request (or a rate-limit hit from two networks) must differ per visitor, not be `cloudflared`'s address.

## Still to do when deploying

The complete pre-production list, including Stripe and what the architecture must provide for it, is the [go-live checklist](go-live-checklist.md).

1. Route `api.valutir.app` through the Cloudflare Tunnel (the tunnel's public hostname creates the proxied DNS record), keep the zone's SSL mode at Full (strict), and add `X-Content-Type-Options: nosniff`, `Content-Security-Policy: frame-ancestors 'none'`, and `Cache-Control: no-store` to API responses with a Response Header Transform Rule.
2. Keep the Tunnel the only way to the API: the EC2 security group has no inbound rules, so nobody can reach the origin except through your own Cloudflare zone. (An IP allow-list of Cloudflare's ranges wouldn't be enough: they're shared by every Cloudflare customer, so anyone could route requests through their own zone or Worker and skip your WAF and edge rules.) Also add a WAF rule on the API hostname that blocks everything except `/api/*` and `/health`, and a skip rule so Bot Fight Mode, managed challenges, and tight rate limits never apply to `/api/billing/webhook`: Stripe can't solve a challenge, and blocked webhooks mean paid accounts stay locked. (Cloudflare Access isn't a fit: it's a login gate for internal apps, not for a public API.)
3. The CSP ships as `Content-Security-Policy-Report-Only`. Click through the deployed app (sign-in, Turnstile on the contact page, calendar), fix what the browser console reports, then set `ENFORCE_CSP = true`.
4. Turn on HSTS in the Cloudflare dashboard (SSL/TLS > Edge Certificates) with a short `max-age` once the app and API both work over HTTPS; raise it, and consider `includeSubDomains`, once it's stable.
