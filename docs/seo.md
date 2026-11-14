# Search engines and AI crawlers

Every public page is served as finished HTML, so Google, Bing and AI crawlers (GPTBot, ClaudeBot, PerplexityBot and others, most of which don't run JavaScript) read the same text a visitor sees. Signed-in screens and links from emails are kept out of search.

## How it works

`npm run build` runs three steps:

1. `vite build`: the normal client bundle in `dist/`.
2. `vite build --ssr src/entry-server.tsx --outDir dist-ssr`: the same app, bundled to run in Node.
3. `node build/prerender.ts`: renders each page as a signed-out visitor sees it, checks every indexed page against the public page contract (the build fails otherwise), and writes the files below into `dist/`.

The dev server renders pages the same way, through the same `renderPage()` in `src/entry-server.tsx` (`devPageRendering` in `vite.config.ts`), so `view-source:http://localhost:5173/calculator` shows exactly what a crawler gets in production.

| Output | What it is |
|---|---|
| `index.html`, `calculator.html`, `streaming-cost-calculator.html`, `ai-tools-cost-calculator.html`, `software-cost-calculator.html`, `plans.html`, `register.html`, `login.html`, `contact.html`, `privacy.html`, `terms.html`, `refunds.html` | The page's full HTML and styles, its own title, description, canonical link and Open Graph tags; `index.html` also has JSON-LD (`SoftwareApplication` with both prices). Cloudflare Pages serves `plans.html` at `/plans`. |
| `my-subs.html`, `subscriptions/new.html`, `reset-password.html`, … | An empty page with `noindex`; the app fills it in the browser. |
| `404.html` | The same empty page for every other path (`/subscriptions/12`, `/calendar/day/…`, typos). Pages returns it with status 404, so unknown URLs stay out of search; in the browser the app still opens normally. |
| `robots.txt` | Allows every crawler, disallows the private and token routes, points to the sitemap. |
| `sitemap.xml` | The indexed pages. |
| `llms.txt` | A short Markdown overview of ValuTir and its pages for AI assistants ([llmstxt.org](https://llmstxt.org)). |
| `_redirects` | `/plans/` → `/plans` (301) for every indexed page, so each page has one URL. |

All of it comes from one list, `frontend/src/seo/pages.ts`. When the user moves between pages in the app, `src/seo/RouteMeta.tsx` updates the title, description, robots and canonical tags from the same list.

The app doesn't hydrate the prerendered HTML: it renders fresh over it (`src/main.tsx`), because a signed-in visitor's header differs from the signed-out one. Emotion keeps the prerendered styles (they sit in `<head>`), so the swap doesn't flash.

## Rules

The contract every public page follows, now and for new pages, is in [AGENTS.md, "Public pages"](../AGENTS.md#public-pages-search-engines-and-ai-tools). In short: listed in `src/seo/pages.ts`; its own title, description, canonical link and JSON-LD; one `<main>` with the only `<h1>` and at least 60 words of real text; a top-level path; renders without a browser. `publicPageProblems()` (`src/seo/documents.ts`) checks it in the build and in `test/seo.test.tsx`, and names what's wrong.

`VITE_SITE_URL` sets the origin used in canonical links, the sitemap, `robots.txt`, `llms.txt` and the JSON-LD. It defaults to `https://valutir.app`; set it only for another host, such as staging.

## Testing it

### Locally

Quickest: with the dev server running (`docker compose up -d`), open `view-source:http://localhost:5173/calculator`, or:

```bash
curl -s http://localhost:5173/calculator | grep -E '<title>|name="description"|rel="canonical"|<h1|<h2'

# The crawler files are generated in dev too
curl -s http://localhost:5173/robots.txt
```

To check the production build itself, build, then serve `dist/` on port 4173:

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
