import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // A production bundle without an API URL would send every request to "undefined/api/...".
  if (command === 'build' && !loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL?.trim()) {
    throw new Error('VITE_API_URL must be set for builds (in .env, the environment, or the VITE_API_URL Docker build argument).')
  }

  return {
    plugins: [react()],
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
