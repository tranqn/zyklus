import { expect, test, type Page } from '@playwright/test'

let counter = 0
/** Create a fresh account; the app then shows onboarding. */
async function signUp(page: Page, email = `e2e-${Date.now()}-${counter++}@example.test`, password = 'ein-langes-test-passwort') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Registrieren' }).click()
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort').fill(password)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Konto erstellen' }).click()
  return { email, password }
}

async function onboard(page: Page, register = true) {
  if (register) await signUp(page)
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

  // the exercise info sheet plays the EffectCraft animation (Lottie, rendered as SVG)
  await page.getByRole('link', { name: 'Plan' }).click()
  await page.getByRole('button', { name: /^Infos zu/ }).first().click()
  await expect(page.getByRole('img', { name: /^Animation:/ }).locator('svg')).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()
  await page.getByRole('link', { name: 'Heute' }).click()

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
  // no button may stick out of its card or sheet (long labels must wrap)
  await page.goto('/#/einstellungen')
  const wide = await page.evaluate(() =>
    [...document.querySelectorAll('.btn')].filter((b) => b.getBoundingClientRect().right > window.innerWidth + 1).map((b) => b.textContent),
  )
  expect(wide).toEqual([])
  expect(errors).toEqual([])
})

test('account: register, data syncs to a second device, logout clears it', async ({ browser }) => {
  test.setTimeout(60_000)
  const email = `e2e-${Date.now()}@example.test`
  const password = 'ein-langes-test-passwort'

  const phone = await browser.newPage()
  await signUp(phone, email, password)
  await onboard(phone, false)
  await expect(phone.getByText('Bitte bestätige deine E-Mail-Adresse')).toBeVisible()

  // log something and wait for the upload
  await phone.getByRole('link', { name: 'Mehr' }).click()
  await phone.getByRole('link', { name: /Cardio/ }).click()
  await phone.getByRole('button', { name: 'Eintragen' }).click()
  await phone.goto('/#/konto')
  await expect(phone.getByText('Synchronisiert', { exact: true })).toBeVisible({ timeout: 10_000 })

  // a second device signs in and gets the same plan and the cardio entry
  const laptop = await browser.newPage()
  await laptop.goto('/')
  await laptop.getByLabel('E-Mail').fill(email)
  await laptop.getByLabel('Passwort').fill(password)
  await laptop.locator('form').getByRole('button', { name: 'Anmelden' }).click()
  await expect(laptop.getByRole('heading', { name: /Testi/ })).toBeVisible()
  await laptop.goto('/#/cardio')
  await expect(laptop.getByText('Spazieren / Gehen').last()).toBeVisible()

  // logging out with "remove data" brings back the sign-in screen and an empty device
  await laptop.goto('/#/konto')
  // a long e-mail address must not widen the page
  expect(await laptop.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await laptop.getByRole('button', { name: 'Abmelden' }).click()
  await laptop.getByRole('button', { name: 'Abmelden und Daten vom Gerät entfernen' }).click()
  await expect(laptop.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible()
  const stored = await laptop.evaluate(() => JSON.parse(localStorage.getItem('zyklus-v1') ?? '{}').state?.profile ?? null)
  expect(stored).toBeNull()
})
