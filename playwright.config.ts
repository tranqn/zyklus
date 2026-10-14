import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'de-DE',
    trace: 'retain-on-failure',
  },
  // mobile first: the app is built for phones
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      // fresh database per run; mails are printed to the log instead of sent
      command: 'rm -rf .e2e-data && node server/src/index.ts',
      env: { PORT: '8787', APP_ORIGIN: 'http://localhost:4173', DATA_DIR: '.e2e-data' },
      url: 'http://localhost:8787/api/health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'pnpm build && pnpm preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
