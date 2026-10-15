import type { Food } from './types'

const BASE = 'https://world.openfoodfacts.org'
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
