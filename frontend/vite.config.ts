import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isPageRequest } from './build/pageRequest'
import { cloudflareHeadersFile } from './build/securityHeaders'

/** Writes dist/_headers (security headers for Cloudflare) with the API origin from VITE_API_URL. */
const cloudflareHeaders = (apiUrl: string): Plugin => ({
  name: 'valutir-cloudflare-headers',
  // Client build only; the prerender build (--ssr) never ships.
  apply: (_config, { command, isSsrBuild }) => command === 'build' && !isSsrBuild,
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: '_headers', source: cloudflareHeadersFile(apiUrl) })
  },
})

/**
 * The dev server serves pages the way production does: rendered by src/entry-server.tsx with their
 * title, description and content (docs/seo.md), not an empty shell. Assets and modules pass through.
 */
/** The generated crawler files, served by the dev server from the same functions the build uses. */
const CRAWLER_FILES: Record<string, { build: string; type: string }> = {
  '/robots.txt': { build: 'robotsTxt', type: 'text/plain; charset=utf-8' },
  '/sitemap.xml': { build: 'sitemapXml', type: 'application/xml; charset=utf-8' },
  '/llms.txt': { build: 'llmsTxt', type: 'text/plain; charset=utf-8' },
}

const devPageRendering = (): Plugin => ({
  name: 'valutir-dev-page-rendering',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const url = request.originalUrl ?? request.url ?? '/'
      const path = new URL(url, 'http://localhost').pathname
      const crawlerFile = CRAWLER_FILES[path]
      if (!crawlerFile && !isPageRequest(request.method, path)) return next()
      try {
        if (crawlerFile) {
          const entry = await server.ssrLoadModule('/src/entry-server.tsx') as Record<string, unknown> & { SITE_URL: string }
          response.setHeader('Content-Type', crawlerFile.type)
          response.end((entry[crawlerFile.build] as (siteUrl: string) => string)(entry.SITE_URL))
          return
        }
        const template = await server.transformIndexHtml(url, readFileSync(resolve(server.config.root, 'index.html'), 'utf8'))
        const entry = await server.ssrLoadModule('/src/entry-server.tsx') as { renderPage: (template: string, path: string) => string }
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(entry.renderPage(template, path))
      } catch (error) {
        server.ssrFixStacktrace(error as Error)
        next(error)
      }
    })
  },
})

/**
 * Dev-server rendering only: `@mui/icons-material/CheckRounded` is CommonJS, and Node hands its
 * default export over as an object. Point those imports at the package's ES module copy (esm/),
 * which Vite then transforms like source. The browser and the build are unaffected.
 */
const devSsrIconImports = (): Plugin => ({
  name: 'valutir-dev-ssr-icon-imports',
  apply: 'serve',
  enforce: 'pre',
  resolveId(source, importer, options) {
    const icon = options?.ssr ? /^@mui\/icons-material\/([A-Za-z0-9]+)$/.exec(source) : null
    return icon ? this.resolve(`@mui/icons-material/esm/${icon[1]}.js`, importer, { ...options, skipSelf: true }) : null
  },
})

export default defineConfig(({ command, mode }) => {
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL?.trim() ?? ''
  // A production bundle without an API URL would send every request to "undefined/api/...".
  if (command === 'build' && !apiUrl) {
    throw new Error('VITE_API_URL must be set for builds (in .env, the environment, or the Cloudflare build variables).')
  }

  return {
    plugins: [react(), cloudflareHeaders(apiUrl), devPageRendering(), devSsrIconImports()],
    // The prerender build (src/entry-server.tsx) bundles every dependency, so Node never has to
    // resolve MUI's and Emotion's packages itself. The dev server loads them from node_modules.
    ssr: command === 'build' ? { noExternal: true } : { noExternal: ['@mui/icons-material'] },
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        usePolling: true,   // fixes file change detection on Docker volumes
        interval: 300,
      },
      hmr: {
        clientPort: 5173,
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
      css: true,
    },
  }
})
