import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflareHeadersFile } from './build/securityHeaders'

/** Writes dist/_headers (security headers for Cloudflare) with the API origin from VITE_API_URL. */
const cloudflareHeaders = (apiUrl: string): Plugin => ({
  name: 'valutir-cloudflare-headers',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: '_headers', source: cloudflareHeadersFile(apiUrl) })
  },
})

export default defineConfig(({ command, mode }) => {
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL?.trim() ?? ''
  // A production bundle without an API URL would send every request to "undefined/api/...".
  if (command === 'build' && !apiUrl) {
    throw new Error('VITE_API_URL must be set for builds (in .env, the environment, or the Cloudflare build variables).')
  }

  return {
    plugins: [react(), cloudflareHeaders(apiUrl)],
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
