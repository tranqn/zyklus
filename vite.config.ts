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

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy: off },
  preview: { proxy: off },
  // Playwright specs in e2e/ are not vitest tests
  test: { include: ['src/**/*.test.ts'] },
})
