import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await page.getByLabel('Wie dürfen wir dich nennen? (optional)').fill('Testi')
  await page.getByRole('button', { name: 'Plan erstellen' }).click()
  await page.getByRole('button', { name: /Muskelaufbau/ }).click()
  // goal, level, place, days, duration, body, activity
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Weiter' }).click()
  await expect(page.getByRole('heading', { name: 'Dein Plan, Testi' })).toBeVisible()
  await page.getByRole('button', { name: "Los geht's" }).click()
  await expect(page.getByRole('heading', { name: /Testi/ })).toBeVisible()
}

test('onboarding, workout with test set, finish', async ({ page }) => {
  await onboard(page)
  await expect(page.getByText('Woche 1/5 · Einheit 1/3')).toBeVisible()

  await page.getByRole('button', { name: 'Training starten' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Training starten' }).click()
  await expect(page).toHaveURL(/#\/training/)

  const first = page.locator('section.card').first()
  await first.getByLabel('Gewicht Satz T').fill('60')
  await first.getByLabel('Wiederholungen Satz T').fill('10')
  await first.getByRole('button', { name: 'Satz T abhaken' }).click()

  // the test set calibrates the next set and starts the rest timer
  await expect(first.getByLabel('Gewicht Satz 1')).toHaveAttribute('placeholder', /\d/)
  await expect(page.getByRole('timer')).toBeVisible()
  await first.getByRole('button', { name: 'Satz 1 abhaken' }).click()

  await page.getByRole('button', { name: 'Fertig' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Woche 1/5 · Einheit 2/3')).toBeVisible()

  // survives a reload (persisted)
  await page.reload()
  await expect(page.getByText('Woche 1/5 · Einheit 2/3')).toBeVisible()
  await page.getByRole('link', { name: 'Fortschritt' }).click()
  await page.getByRole('button', { name: 'Verlauf' }).click()
  await expect(page.getByText('Ganzkörper A').first()).toBeVisible()
})

test('nutrition: free text, recipe, supplements', async ({ page }) => {
  await onboard(page)
  await page.getByRole('link', { name: 'Ernährung' }).click()

  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await page.getByRole('button', { name: 'Text', exact: true }).click()
  await page.getByLabel('Mahlzeit als Text').fill('80g Haferflocken, 250g Skyr und 1 Banane')
  await page.getByRole('button', { name: '3 Lebensmittel eintragen' }).click()
  await expect(page.getByText('Skyr natur')).toBeVisible()

  await page.getByRole('button', { name: 'Als Rezept speichern' }).click()
  await page.getByLabel('Name').fill('Skyr-Bowl')
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()

  await page.getByRole('button', { name: 'Zu Snacks hinzufügen' }).click()
  await page.getByRole('button', { name: 'Rezepte' }).click()
  await page.getByRole('button', { name: /^Skyr-Bowl/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Eintragen' }).click()
  await expect(page.getByText('Skyr natur')).toHaveCount(2)

  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Kreatin' }).click()
  await page.getByRole('button', { name: 'Schließen' }).click()
  await page.getByRole('button', { name: /Kreatin/ }).click()
  await expect(page.getByText('1 von 1 genommen')).toBeVisible()
})

test('every main route renders without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await onboard(page)
  for (const hash of ['#/plan', '#/ernaehrung', '#/fortschritt', '#/mehr', '#/mobility', '#/cardio', '#/einstellungen', '#/modus', '#/wissen']) {
    await page.goto('/' + hash)
    await expect(page.locator('h1')).toBeVisible()
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
  expect(errors).toEqual([])
})
