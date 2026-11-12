import { MICRO_UNIT, type MicroId, type Micros } from './micronutrients'
import type { Food } from './types'

const BASE = 'https://world.openfoodfacts.org'
// `nutriments` is the whole object, so the micronutrients come along without asking for each one
const FIELDS = 'code,product_name,product_name_de,product_name_en,product_name_vi,brands,nutriments,serving_quantity'

interface OffProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  product_name_en?: string
  product_name_vi?: string
  brands?: string | string[]
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : 0
}

/** The Open Food Facts key per nutrient; what is not listed here is not asked for. */
const OFF_KEY: Record<MicroId, string> = {
  iron: 'iron',
  calcium: 'calcium',
  magnesium: 'magnesium',
  zinc: 'zinc',
  potassium: 'potassium',
  sodium: 'sodium',
  iodine: 'iodine',
  vitaminD: 'vitamin-d',
  vitaminB12: 'vitamin-b12',
  folate: 'vitamin-b9',
  vitaminC: 'vitamin-c',
}

/** Highest value per 100 g that is still believable; above it the unit was wrong, not the food. */
const PLAUSIBLE: Record<MicroId, number> = {
  iron: 100,
  calcium: 2000,
  magnesium: 1000,
  zinc: 100,
  potassium: 5000,
  sodium: 10000,
  iodine: 10000,
  vitaminD: 2000,
  vitaminB12: 1000,
  folate: 5000,
  vitaminC: 5000,
}

const FACTOR: Record<string, number> = { g: 1000, mg: 1, µg: 0.001, mcg: 0.001, ug: 0.001 }

/*
 * Micronutrients from a product. Every value is crowd-sourced from a label, so two things are
 * refused rather than guessed: a value whose unit Open Food Facts does not state (its `_100g`
 * fields are documented as grams, but the data does not always keep to it, and a factor of 1000
 * in a deficiency view is worse than no value at all), and a value that comes out implausible
 * for 100 g of food. What is refused stays unknown, never zero.
 */
function offMicros(n: Record<string, number | string | undefined>): Micros | undefined {
  const out: Micros = {}
  for (const id of Object.keys(OFF_KEY) as MicroId[]) {
    const key = OFF_KEY[id]
    const raw = n[`${key}_100g`]
    if (raw === undefined || raw === '') continue
    const unit = String(n[`${key}_unit`] ?? '').trim().toLowerCase()
    const perMg = FACTOR[unit]
    if (!perMg) continue
    const mg = num(raw) * perMg
    if (!mg && num(raw) !== 0) continue
    const value = MICRO_UNIT[id] === 'mg' ? mg : mg * 1000
    if (value < 0 || value > PLAUSIBLE[id]) continue
    out[id] = Math.round(value * 1000) / 1000
  }
  return Object.keys(out).length ? out : undefined
}

export function toFood(p: OffProduct, lang: 'de' | 'en' | 'vi' = 'de'): Food | undefined {
  const n = p.nutriments ?? {}
  const name = (p[`product_name_${lang}`] || p.product_name || p.product_name_de || p.product_name_en || '').trim()
  let kcal = num(n['energy-kcal_100g'])
  if (!kcal && n['energy_100g']) kcal = num(n['energy_100g']) / 4.184
  if (!name || !kcal) return undefined
  const portion = num(p.serving_quantity)
  return {
    id: `off-${p.code}`,
    name,
    brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim(),
    barcode: p.code,
    per100: {
      kcal: Math.round(kcal),
      protein: num(n['proteins_100g']),
      carbs: num(n['carbohydrates_100g']),
      fat: num(n['fat_100g']),
    },
    micros: offMicros(n),
    portion: portion > 0 ? portion : undefined,
    portionLabel: portion > 0 ? '1 Portion' : undefined,
  }
}

/**
 * Search runs through a same-origin proxy (/off/* -> search.openfoodfacts.org),
 * because the OFF search APIs send no CORS headers. Caddy serves it in
 * production, the Vite dev server in development.
 */
export async function searchOff(query: string, signal?: AbortSignal, lang: 'de' | 'en' | 'vi' = 'de'): Promise<Food[]> {
  const url = `/off/search?q=${encodeURIComponent(query)}&page_size=25&langs=${lang}&fields=${FIELDS}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (${res.status})`)
  const data = (await res.json()) as { hits?: OffProduct[] }
  return (data.hits ?? []).map((h) => toFood(h, lang)).filter((f): f is Food => !!f)
}

export async function lookupBarcode(code: string, lang: 'de' | 'en' | 'vi' = 'de'): Promise<Food | undefined> {
  const res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`)
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (${res.status})`)
  const data = (await res.json()) as { status?: number; product?: OffProduct }
  if (!data.product) return undefined
  return toFood({ ...data.product, code }, lang)
}
