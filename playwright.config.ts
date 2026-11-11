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
    // Playwright waits for an element to stop moving before it clicks, and every control now
    // springs on press. The app turns all animation off under reduce (src/index.css), so this
    // keeps the tests deterministic instead of racing the spring.
    reducedMotion: 'reduce',
  },
  // mobile first: the app is built for phones
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /vi\.spec/ },
    // smallest common phone width: catches labels and layouts that overflow
    { name: 'small', use: { ...devices['iPhone SE'], browserName: 'chromium', viewport: { width: 320, height: 568 } }, grep: /every main route|account/, testIgnore: /vi\.spec/ },
    // Vietnamese users get the full app in Vietnamese (browser language vi-VN)
    { name: 'vi', use: { ...devices['Pixel 7'], locale: 'vi-VN' }, testMatch: /vi\.spec/ },
    { name: 'vi-small', use: { ...devices['iPhone SE'], browserName: 'chromium', locale: 'vi-VN', viewport: { width: 320, height: 568 } }, testMatch: /vi\.spec/, grep: /overflow/ },
  ],
  webServer: [
    {
      // fresh database per run; mails are printed to the log instead of sent
      command: 'rm -rf .e2e-data && node server/src/index.ts',
      env: { PORT: '8787', APP_ORIGIN: 'http://localhost:4173', DATA_DIR: '.e2e-data', REGISTER_LIMIT_PER_HOUR: '100' },
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
