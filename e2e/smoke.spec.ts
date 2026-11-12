import { expect, test, type Page } from '@playwright/test'
import { confirm } from './mailbox.ts'

let counter = 0
/** Create a fresh account; the app then shows onboarding. */
async function signUp(page: Page, email = `e2e-${Date.now()}-${counter++}-${Math.random().toString(36).slice(2, 8)}@example.test`, password = 'ein-langes-test-passwort') {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Registrieren' }).click()
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort').fill(password)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Konto erstellen' }).click()
  // registration only sends a mail; the link in it confirms the address and signs in
  await expect(page.getByRole('heading', { name: 'Schau in dein Postfach' })).toBeVisible()
  await confirm(page, email, 'Zur App')
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

test('onboarding: the age can be typed, not only stepped', async ({ page }) => {
  await signUp(page)
  await page.getByLabel('Wie dürfen wir dich nennen? (optional)').fill('Testi')
  await page.getByRole('button', { name: 'Plan erstellen' }).click()
  await page.getByRole('button', { name: /Muskelaufbau/ }).click()
  const age = page.getByLabel('Alter', { exact: true })
  for (let i = 0; i < 7 && !(await age.isVisible()); i++) await page.getByRole('button', { name: 'Weiter' }).click()
  await expect(age).toBeVisible()

  // a partial number must survive: clamped per keystroke, "1" would jump to the minimum of 14
  await age.fill('1')
  await expect(age).toHaveValue('1')
  await age.fill('18')
  await age.press('Enter')
  await expect(age).toHaveValue('18')

  // below the minimum it clamps, but only once the field is left
  await age.fill('5')
  await expect(age).toHaveValue('5')
  await age.press('Enter')
  await expect(age).toHaveValue('14')

  // the buttons still work and still carry their accessible names
  await page.getByRole('button', { name: 'Alter erhöhen' }).click()
  await expect(age).toHaveValue('15')
})

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

  const first = page.locator('[data-slot="card"]').first()
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

  // the first workout lights the daily flame and celebrates it once
  const party = page.getByRole('dialog').filter({ hasText: 'Deine Flamme brennt' })
  await expect(party).toBeVisible()
  await party.getByRole('button', { name: 'Weiter' }).click()
  await expect(page.getByRole('link', { name: /Tages-Flamme: 1 Tag/ })).toBeVisible()

  // survives a reload (persisted)
  await page.reload()
  await expect(page.getByText('Woche 1/5 · Einheit 2/3')).toBeVisible()
  await page.getByRole('link', { name: 'Fortschritt' }).click()

  // body graphic: tapping a muscle opens its detail sheet; recovery mode recolors it
  const figure = page.getByRole('group', { name: 'Körpergrafik der trainierten Muskeln' })
  await figure.getByRole('button', { name: /^Brust:/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Brust' })).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()
  await page.getByRole('radio', { name: 'Erholung' }).click()
  await expect(figure.getByRole('button', { name: /^Brust: (Belastet|Erholt sich|Keine Daten)$/ })).toBeVisible()

  await page.getByRole('radio', { name: 'Verlauf' }).click()
  await expect(page.getByText('Ganzkörper A').first()).toBeVisible()
})

test('mobility: the player shows the move animation', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/mobility')
  await page.getByRole('button', { name: /^Morgenroutine/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Katze-Kuh' })).toBeVisible()
  await expect(dialog.getByRole('img', { name: /^Animation:/ }).locator('svg')).toBeVisible()
  await dialog.getByRole('button', { name: 'Weiter' }).click()
  await expect(dialog.getByRole('heading', { name: 'Kindhaltung mit Seitneigung' })).toBeVisible()
  await expect(dialog.getByRole('img', { name: /^Animation:/ }).locator('svg')).toBeVisible()
})

test('flames: 15 minutes of cardio light the flame, achievements page and weekly goal', async ({ page }) => {
  await onboard(page)
  await expect(page.getByText('Zünde deine Flamme')).toBeVisible()
  await page.getByRole('link', { name: 'Cardio' }).click()
  // 30 minutes by default, down to 15
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Dauer verringern' }).click()
  await page.getByRole('button', { name: 'Eintragen' }).click()
  const party = page.getByRole('dialog').filter({ hasText: 'Deine Flamme brennt' })
  await expect(party).toBeVisible()
  await party.getByRole('button', { name: 'Weiter' }).click()

  await page.goto('/#/erfolge')
  await expect(page.getByRole('heading', { name: 'Flammen und Erfolge' })).toBeVisible()
  await expect(page.getByText('Heute erledigt, deine Flamme brennt.')).toBeVisible()
  await expect(page.getByText('Diese Woche: 1 von 3 aktiven Tagen')).toBeVisible()
  await page.getByRole('button', { name: 'Wochenziel in aktiven Tagen verringern' }).click()
  await page.getByRole('button', { name: 'Wochenziel in aktiven Tagen verringern' }).click()
  // reaching the weekly goal is celebrated (the modal sheet hides the page from assistive tech meanwhile)
  const week = page.getByRole('dialog', { name: 'Wochenziel geschafft' })
  await expect(week.getByText('Woche in Folge')).toBeVisible()
  await week.getByRole('button', { name: 'Weiter' }).click()
  await expect(page.getByRole('main').getByRole('heading', { name: 'Wochenziel geschafft' })).toBeVisible()
  await page.getByRole('button', { name: /Feuerfest/ }).click()
  await expect(page.getByRole('dialog').getByText('Tages-Flamme von 3 Tagen')).toBeVisible()
})

test('friends: invite link, see the flame of the friend, shared goal challenge', async ({ page, browser }) => {
  const a = page
  await onboard(a)
  await a.goto('/#/freunde')
  const code = (await a.getByText(/^[A-Z2-9]{8}$/).textContent())!

  // B opens A's link, accepts and lights the flame with cardio
  const ctx = await browser.newContext(test.info().project.use)
  const b = await ctx.newPage()
  await onboard(b)
  await b.goto(`/#/einladung/${code}`)
  await expect(b.getByText('Testi lädt dich ein.')).toBeVisible()
  await b.getByRole('button', { name: 'Annehmen' }).click()
  await expect(b.getByRole('heading', { name: 'Freunde', exact: true })).toBeVisible()
  await expect(b.getByRole('button', { name: /Testi/ })).toBeVisible()
  await b.goto('/#/cardio')
  await b.getByRole('button', { name: 'Eintragen' }).click()
  await b.getByRole('dialog').getByRole('button', { name: 'Weiter' }).click()

  // A sees B active today once B's upload is through
  await expect(async () => {
    await a.reload()
    await expect(a.getByText(/heute aktiv/)).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })

  // A starts a shared goal with B: B's active day already counts
  await a.getByRole('radio', { name: 'Challenges' }).click()
  await a.getByRole('button', { name: 'Challenge starten' }).click()
  const sheet = a.getByRole('dialog')
  await sheet.getByRole('button', { name: 'Testi' }).click()
  await sheet.getByRole('button', { name: 'Starten' }).click()
  await expect(a.getByRole('dialog').getByText('1 von 10 aktive Tage')).toBeVisible()

  await b.goto('/#/freunde')
  await b.getByRole('radio', { name: 'Challenges' }).click()
  await expect(b.getByText('Zusammen 10 aktive Tage')).toBeVisible()
  await ctx.close()
})

test('today: change the training days in the week strip', async ({ page }) => {
  await onboard(page)
  await expect(page.getByText('Woche 1/5 · Einheit 1/3')).toBeVisible()
  // the card keeps its height when editing starts, nothing below jumps
  const card = page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { name: 'Diese Woche' }) })
  const before = (await card.boundingBox())!.height
  await page.getByRole('button', { name: 'Trainingstage ändern' }).click()
  await expect(page.getByRole('button', { name: 'Fertig' })).toBeVisible()
  expect((await card.boundingBox())!.height).toBe(before)
  // same number of days: only the weekdays move, the plan stays
  const days = page.getByRole('button', { name: /: Trainingstag$/ })
  const on = await days.evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed') === 'true'))
  await days.nth(on.indexOf(true)).click()
  await days.nth(on.indexOf(false)).click()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await expect(page.getByText('Trainingstage gespeichert')).toBeVisible()
  await expect(page.getByText('Woche 1/5 · Einheit 1/3')).toBeVisible()

  // one more day rebuilds the plan after a confirmation
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Trainingstage ändern' }).click()
  const now = await days.evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed') === 'true'))
  await days.nth(now.indexOf(false)).click()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await expect(page.getByText('Woche 1/5 · Einheit 1/4')).toBeVisible()
})

test('plan: switch to the Winter Arc program and back', async ({ page }) => {
  await onboard(page)
  await page.getByRole('link', { name: 'Plan' }).click()
  await expect(page.getByText('Aktiv: Automatisch')).toBeVisible()
  await page.getByRole('button', { name: 'Programm wechseln' }).click()
  const sheet = page.getByRole('dialog', { name: 'Programm' })
  await sheet.getByRole('radio', { name: 'Winter Arc' }).click()
  await expect(sheet.getByText(/Kevin Zhang/)).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await sheet.getByRole('button', { name: 'Übernehmen' }).click()

  await expect(page.getByText('Programm gewechselt')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Winter Arc', exact: true })).toBeVisible()
  for (const day of ['Winter Arc A', 'Winter Arc B', 'Winter Arc C']) await expect(page.getByRole('heading', { name: day })).toBeVisible()
  await expect(page.getByText(/Klimmzüge/).first()).toBeVisible()
  await expect(page.getByText(/Pistol Squats/).first()).toBeVisible()
  await page.getByRole('button', { name: /^Infos zu Pistol Squats/ }).first().click()
  await expect(page.getByRole('img', { name: /^Animation:/ }).locator('svg')).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()

  await page.getByRole('button', { name: 'Programm wechseln' }).click()
  await sheet.getByRole('radio', { name: 'Automatisch' }).click()
  page.once('dialog', (d) => d.accept())
  await sheet.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(page.getByText('Aktiv: Automatisch')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ganzkörper A' })).toBeVisible()
})

test('nutrition: free text, recipe, supplements', async ({ page }) => {
  await onboard(page)
  await page.getByRole('link', { name: 'Ernährung' }).click()

  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await page.getByRole('radio', { name: 'Text', exact: true }).click()
  await page.getByLabel('Mahlzeit als Text').fill('80g Haferflocken, 250g Skyr und 1 Banane')
  await page.getByRole('button', { name: '3 Lebensmittel eintragen' }).click()
  await expect(page.getByText('Skyr natur')).toBeVisible()

  await page.getByRole('button', { name: 'Als Rezept speichern' }).click()
  await page.getByLabel('Name').fill('Skyr-Bowl')
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()

  await page.getByRole('button', { name: 'Zu Snacks hinzufügen' }).click()
  await page.getByRole('radio', { name: 'Rezepte' }).click()
  await page.getByRole('button', { name: /^Skyr-Bowl/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Eintragen' }).click()
  await expect(page.getByText('Skyr natur')).toHaveCount(2)

  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Kreatin' }).click()
  await page.getByRole('button', { name: 'Schließen' }).click()
  await page.getByRole('button', { name: /Kreatin/ }).click()
  await expect(page.getByText('1 von 1 genommen')).toBeVisible()

  // micronutrients: of the six logged entries only the two bananas have data, and the card says so
  const micro = page.getByRole('heading', { name: 'Mikronährstoffe' }).locator('..').locator('..')
  await expect(micro.getByText(/Aus 2 von 6 Einträgen/)).toBeVisible()
  await micro.getByRole('button', { name: 'Anzeigen' }).click()
  await expect(page.getByText('Kalium', { exact: true })).toBeVisible()
  // iodine is in no source we use: it must say so instead of showing a zero
  await expect(page.getByText('keine Daten').first()).toBeVisible()
  await expect(page.getByText(/Blutuntersuchung/)).toBeVisible()
})

test('every main route renders without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await onboard(page)
  for (const hash of ['#/plan', '#/ernaehrung', '#/fortschritt', '#/mehr', '#/mobility', '#/cardio', '#/einstellungen', '#/modus', '#/wissen', '#/erfolge', '#/freunde']) {
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
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
  const password = 'ein-langes-test-passwort'

  const phone = await browser.newPage()
  await signUp(phone, email, password)
  await onboard(phone, false)
  // signing up goes through the confirmation link now, so the reminder banner must be gone
  await expect(phone.getByText('Bitte bestätige deine E-Mail-Adresse')).toHaveCount(0)

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

  // forgot password confirms the request and points to the spam folder
  await laptop.getByRole('button', { name: 'Passwort vergessen?' }).click()
  await laptop.getByRole('dialog').getByLabel('E-Mail').fill(email)
  await laptop.getByRole('button', { name: 'Link senden' }).click()
  await expect(laptop.getByText(/eine Stunde gültig/)).toBeVisible()
  await expect(laptop.getByRole('dialog').getByText(/Schau im Spam-Ordner/)).toBeVisible()
})

test('pages load on demand and still open offline', async ({ page, context }) => {
  await onboard(page)
  // the service worker controls the page and the idle prefetch has cached the lazy page chunks
  await page.waitForFunction(async () => {
    if (!navigator.serviceWorker.controller) return false
    const keys = await (await caches.open('zyklus-v3')).keys()
    return ['Nutrition', 'Progress', 'More'].every((n) => keys.some((r) => r.url.includes(`/assets/${n}-`)))
  })
  await context.setOffline(true)
  await page.getByRole('link', { name: 'Ernährung' }).click()
  await expect(page.locator('h1')).toBeVisible()
  await page.getByRole('link', { name: 'Fortschritt' }).click()
  await expect(page.getByRole('heading', { name: 'Deine Entwicklung' })).toBeVisible()
  await context.setOffline(false)
})

test('meal planner: create a week, recipe, swap, log, shopping list, vegan', async ({ page }) => {
  await onboard(page)
  await page.getByRole('link', { name: 'Ernährung' }).click()
  await page.getByRole('radio', { name: 'Planer', exact: true }).click()
  await page.getByRole('button', { name: 'Plan erstellen' }).click()
  await expect(page.getByText('Plan erstellt')).toBeVisible()

  // every main meal of today is planned
  for (const meal of ['Frühstück', 'Mittagessen', 'Abendessen']) await expect(page.locator('[data-slot="card"] .eyebrow', { hasText: meal })).toBeVisible()
  const first = page.locator('[data-slot="card"]').filter({ has: page.locator('.eyebrow', { hasText: 'Frühstück' }) })
  const dish = (await first.locator('h3').innerText()).trim()

  await first.getByRole('button', { name: `Rezept für ${dish}` }).click()
  await expect(page.getByRole('dialog', { name: dish }).getByRole('heading', { name: 'Zubereitung' })).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()

  await first.getByRole('button', { name: `${dish} tauschen` }).click()
  await page.getByRole('dialog', { name: 'Gericht tauschen' }).locator('.list-row').first().click()
  await expect(page.getByText('Getauscht')).toBeVisible()
  const swapped = (await first.locator('h3').innerText()).trim()
  expect(swapped).not.toBe(dish)

  // logging puts the ingredients into today's diary
  await first.getByRole('button', { name: `${swapped} ins Tagebuch eintragen` }).click()
  await expect(first.getByText('Eingetragen', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Tagebuch', exact: true }).click()
  await expect(page.locator('[data-slot="card"] .list-row').first()).toBeVisible()
  await page.getByRole('radio', { name: 'Planer', exact: true }).click()

  await page.getByRole('button', { name: 'Einkaufsliste' }).click()
  const list = page.getByRole('dialog', { name: 'Einkaufsliste' })
  await expect(list.getByRole('heading', { name: 'Vorrat' })).toBeVisible()
  const box = list.getByRole('checkbox').first()
  await box.check()
  await expect(box).toBeChecked()
  await page.getByRole('button', { name: 'Schließen' }).click()

  await page.getByRole('button', { name: 'Vorlieben' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Vegan' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Neu vorschlagen' }).click()
  await expect(page.locator('[data-slot="badge"]', { hasText: 'Vegan' })).toBeVisible()
  // the suggestions card offers dishes for what is still open today
  await expect(page.getByRole('heading', { name: 'Was passt heute noch?' })).toBeVisible()
})
