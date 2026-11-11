import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

/**
 * Registration no longer signs the account in: the confirmation link does. Without SMTP the API
 * writes every mail as one JSON line into its data directory (DATA_DIR=.e2e-data, see
 * playwright.config.ts), so a test can pick the link out of it the way a person picks it out of
 * their inbox.
 */
export async function confirmationLink(page: Page, email: string): Promise<string> {
  const want = email.trim().toLowerCase()
  for (let i = 0; i < 100; i++) {
    try {
      const mail = readFileSync('.e2e-data/mails.log', 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { to: string; text: string })
        .reverse()
        .find((m) => m.to === want && m.text.includes('token='))
      const token = mail && /token=([\w-]+)/.exec(mail.text)?.[1]
      if (token) return `/#/konto/bestaetigen?token=${token}`
    } catch {
      // the file does not exist yet, or a line is still half written
    }
    await page.waitForTimeout(100)
  }
  throw new Error(`no confirmation mail for ${want} in .e2e-data/mails.log`)
}

/** Follow the link from the mail; the account is signed in afterwards. */
export async function confirm(page: Page, email: string, toApp: string): Promise<void> {
  await page.goto(await confirmationLink(page, email))
  await page.getByRole('button', { name: toApp }).click()
}
