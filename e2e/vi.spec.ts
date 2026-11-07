import { expect, test, type Page } from '@playwright/test'

let n = 0
async function signUpVi(page: Page) {
  await page.goto('/')
  // browser language vi-VN: the app starts in Vietnamese
  await expect(page.getByRole('heading', { name: 'Chào mừng bạn trở lại' })).toBeVisible()
  await page.getByRole('radio', { name: 'Đăng ký' }).click()
  await page.getByLabel('Email').fill(`vi-${Date.now()}-${n++}-${Math.random().toString(36).slice(2, 8)}@example.test`)
  await page.getByLabel('Mật khẩu').fill('mot-mat-khau-dai-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await page.getByLabel('Chúng tôi nên gọi bạn là gì? (không bắt buộc)').fill('Lan')
  await page.getByRole('button', { name: 'Tạo giáo án' }).click()
  await page.getByRole('button', { name: /Tăng cơ/ }).click()
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Tiếp tục' }).click()
  await expect(page.getByRole('heading', { name: 'Giáo án của Lan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Toàn thân (3 buổi)' })).toBeVisible()
  await page.getByRole('button', { name: 'Bắt đầu thôi' }).click()
}

test('Vietnamese: onboarding, plan names, exercise texts', async ({ page }) => {
  await signUpVi(page)
  await expect(page.getByRole('heading', { name: 'Toàn thân A' })).toBeVisible()
  await expect(page.getByText('Tuần 1/5 · Buổi 1/3')).toBeVisible()
  await page.getByRole('link', { name: 'Giáo án' }).click()
  await page.getByRole('button', { name: /^Thông tin về/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Cách thực hiện' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Hoạt ảnh:/ }).locator('svg')).toBeVisible()
})

test('Vietnamese: free-text food logging with Vietnamese dishes', async ({ page }) => {
  await signUpVi(page)
  await page.getByRole('link', { name: 'Dinh dưỡng' }).click()
  await page.getByRole('button', { name: 'Thêm vào Bữa sáng' }).click()
  await page.getByRole('radio', { name: 'Chữ', exact: true }).click()
  await page.getByLabel('Bữa ăn dạng chữ').fill('1 tô phở bò và 2 quả trứng, 1 ly cà phê sữa đá')
  await page.getByRole('button', { name: 'Ghi 3 món' }).click()
  await expect(page.getByText('Phở bò', { exact: true })).toBeVisible()
  await expect(page.getByText('Trứng gà', { exact: true })).toBeVisible()
  // search finds Vietnamese dishes without diacritics
  await page.getByRole('button', { name: 'Thêm vào Bữa trưa' }).click()
  await page.getByLabel('Tìm món ăn').fill('com tam')
  await expect(page.getByRole('button', { name: /Cơm tấm sườn/ })).toBeVisible()
})

test('Vietnamese: every screen without overflow and no untranslated German', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await signUpVi(page)
  for (const hash of ['#/', '#/plan', '#/ernaehrung', '#/fortschritt', '#/mehr', '#/mobility', '#/cardio', '#/einstellungen', '#/modus', '#/wissen', '#/konto', '#/datenschutz', '#/erfolge', '#/freunde']) {
    await page.goto('/' + hash)
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), hash).toBe(true)
    // typical German UI words must not appear in the Vietnamese interface
    const text = await page.locator('body').innerText()
    expect(text, hash).not.toMatch(/\b(Speichern|Zurück|Training starten|Übung|Einstellungen|Ernährung|Wochen?)\b/)
  }
  expect(errors).toEqual([])
})

test('switching the language in settings applies everywhere and survives a reload', async ({ page }) => {
  await signUpVi(page)
  await page.goto('/#/einstellungen')
  await page.getByRole('radio', { name: 'Deutsch' }).click()
  await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible()
  await page.getByRole('link', { name: 'Heute' }).click()
  await expect(page.getByRole('heading', { name: 'Ganzkörper A' })).toBeVisible()
  await page.goto('/#/einstellungen')
  await page.getByRole('radio', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('Vietnamese meal planner without overflow', async ({ page }) => {
  await signUpVi(page)
  await page.goto('/#/ernaehrung')
  await page.getByRole('radio', { name: 'Thực đơn' }).click()
  await page.getByRole('button', { name: 'Tạo thực đơn' }).click()
  await expect(page.getByText('Đã tạo thực đơn')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hôm nay ăn thêm gì?' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Danh sách đi chợ' }).click()
  await expect(page.getByRole('dialog', { name: 'Danh sách đi chợ' }).getByRole('heading', { name: 'Đồ khô và gia vị' })).toBeVisible()
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\b(Zubereitung|Zutaten|Einkaufsliste|Frühstück|Mittagessen|Portionen?)\b/)
})
