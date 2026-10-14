/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

// same-origin proxy for the Open Food Facts search API (it sends no CORS headers)
const off: Record<string, ProxyOptions> = {
  '/off': {
    target: 'https://search.openfoodfacts.org',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/off/, ''),
    headers: { 'User-Agent': 'Zyklus/1.0 (mci.quocnamtran.com)' },
  },
}

// local API: cd server && pnpm dev (port 8787)
const api: Record<string, ProxyOptions> = { '/api': { target: 'http://localhost:8787', changeOrigin: false } }

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy: { ...off, ...api } },
  preview: { proxy: { ...off, ...api } },
  // Playwright specs in e2e/ are not vitest tests
  test: { include: ['src/**/*.test.ts'] },
})
