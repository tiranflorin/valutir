# Search engines and AI crawlers

Every public page is served as finished HTML, so Google, Bing and AI crawlers (GPTBot, ClaudeBot, PerplexityBot and others, most of which don't run JavaScript) read the same text a visitor sees. Signed-in screens and links from emails are kept out of search.

## How it works

`npm run build` runs three steps:

1. `vite build`: the normal client bundle in `dist/`.
2. `vite build --ssr src/entry-server.tsx --outDir dist-ssr`: the same app, bundled to run in Node.
3. `node build/prerender.ts`: renders each page as a signed-out visitor sees it and writes the files below into `dist/`.

| Output | What it is |
|---|---|
| `index.html`, `plans.html`, `register.html`, `login.html`, `contact.html`, `privacy.html`, `terms.html`, `refunds.html` | The page's full HTML and styles, its own title, description, canonical link and Open Graph tags; `index.html` also has JSON-LD (`SoftwareApplication` with both prices). Cloudflare Pages serves `plans.html` at `/plans`. |
| `my-subs.html`, `subscriptions/new.html`, `reset-password.html`, … | An empty page with `noindex`; the app fills it in the browser. |
| `404.html` | The same empty page for every other path (`/subscriptions/12`, `/calendar/day/…`, typos). Pages returns it with status 404, so unknown URLs stay out of search; in the browser the app still opens normally. |
| `robots.txt` | Allows every crawler, disallows the private and token routes, points to the sitemap. |
| `sitemap.xml` | The indexed pages. |
| `llms.txt` | A short Markdown overview of ValuTir and its pages for AI assistants ([llmstxt.org](https://llmstxt.org)). |

All of it comes from one list, `frontend/src/seo/pages.ts`. When the user moves between pages in the app, `src/seo/RouteMeta.tsx` updates the title, description, robots and canonical tags from the same list.

The app doesn't hydrate the prerendered HTML: it renders fresh over it (`src/main.tsx`), because a signed-in visitor's header differs from the signed-out one. Emotion keeps the prerendered styles (they sit in `<head>`), so the swap doesn't flash.

## Rules

- **Every route in `App.tsx` is listed in `src/seo/pages.ts`**: public pages in `INDEXED_PAGES` (title under about 60 characters, description under about 160), private and token routes in `UNLISTED_PAGES`. A route with a parameter goes under a `PRIVATE_PREFIXES` entry. `test/seo.test.tsx` fails otherwise.
- **Public pages must render without a browser**: no `window`, `document` or `localStorage` while rendering. Read them in `useEffect` or an event handler, or guard with `typeof window === 'undefined'` (see `AuthContext`). The build fails if a public page renders without an `<h1>`.
- **Descriptions, `llms.txt` and the JSON-LD state facts**: keep them true when prices, limits or features change (prices come from `src/legal.ts`).
- `VITE_SITE_URL` sets the origin used in canonical links, the sitemap, `robots.txt` and `llms.txt`. It defaults to `https://valutir.app`; set it only for another host, such as staging.

## Testing it

### Locally

Build, then serve `dist/` on port 4173:

```bash
docker compose run --rm frontend-test npm run build
docker compose run --rm -p 4173:4173 frontend-test npx vite preview --host 0.0.0.0 --port 4173
```

In a second terminal, read the pages the way a crawler does, with no JavaScript:

```bash
# Title, description, robots and canonical of a page
curl -s http://localhost:4173/plans | grep -E '<title>|name="description"|name="robots"|rel="canonical"'

# The visible text, as an AI crawler would extract it
curl -s -A "GPTBot" http://localhost:4173/ | sed -e 's/<script[^>]*>[^<]*<\/script>//g' -e 's/<[^>]*>/ /g' | tr -s ' \n' | head -c 1500

# A private page: noindex and no content
curl -s http://localhost:4173/my-subs | grep -E 'name="robots"|<div id="root">'

# The crawler files
curl -s http://localhost:4173/robots.txt
curl -s http://localhost:4173/sitemap.xml
curl -s http://localhost:4173/llms.txt
```

In Chrome, open `http://localhost:4173/`, then DevTools → Command menu (`Cmd+Shift+P`) → "Disable JavaScript" and reload. The page should look the same as with JavaScript on. `view-source:http://localhost:4173/plans` shows the HTML a crawler gets.

`vite preview` answers unknown paths with `index.html`, not `404.html`. To see Cloudflare Pages' own routing locally (status 404 for `/subscriptions/12`, `/plans.html` redirecting to `/plans`), serve `dist/` with `npx wrangler pages dev frontend/dist` instead.

### After a deploy

```bash
curl -sI https://valutir.app/plans | head -1               # 200
curl -sI https://valutir.app/subscriptions/12 | head -1    # 404 (the app still opens in a browser)
curl -s -A "ClaudeBot" https://valutir.app/plans | grep -o '<h1>[^<]*'
curl -s https://valutir.app/robots.txt
```

Then, once:

- **Google Search Console:** add `valutir.app` as a Domain property (DNS TXT record in Cloudflare) and submit `https://valutir.app/sitemap.xml`. URL Inspection → "Test live URL" → "View tested page" shows the HTML and screenshot Google gets.
- **[Rich Results Test](https://search.google.com/test/rich-results)** on `https://valutir.app/` to check the JSON-LD.
- **Bing Webmaster Tools:** import the site from Search Console and submit the sitemap. Bing's index also feeds ChatGPT search and Copilot.
- **Cloudflare AI crawler settings:** in the dashboard's bot and AI crawler settings, make sure AI crawlers aren't blocked and Cloudflare isn't adding its own rules to `robots.txt`. Either would override this file for AI crawlers. Bot Fight Mode should still let verified bots through.
- **Link previews:** paste a URL into LinkedIn's Post Inspector or a WhatsApp chat to check the title and description.

## Not done yet

- **No preview image.** Shared links show text only. Add a 1200×630 PNG under `public/brand/` and an `og:image` tag in `headTags()` (`src/seo/documents.ts`).
- The client bundle is one 930 kB file. Splitting the signed-in screens out would make public pages load faster, which also helps ranking.
