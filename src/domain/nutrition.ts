import { addMicros, scaleMicros, type Micros } from './micronutrients'
import type { CardioEntry, Food, FoodEntry, Macros, Profile, WeightEntry } from './types'
import { addDays, daysBetween, sum, today } from './util'

/** Mifflin-St Jeor */
export function bmr(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'm' ? 5 : -161)
}

/** Daily need incl. an average for the planned training (about 5 kcal per kg per session). */
export function tdee(p: Profile): number {
  const training = (p.daysPerWeek * p.weightKg * 5 * (p.sessionMinutes / 60)) / 7
  return bmr(p) * p.activity + training
}

export const GOAL_KCAL_FACTOR: Record<Profile['goal'], number> = {
  fettabbau: 0.8,
  rekomposition: 0.95,
  muskelaufbau: 1.1,
  kraft: 1.05,
}

export function targets(p: Profile, override?: number, adjustment = 0): Macros {
  let kcal = override ?? tdee(p) * GOAL_KCAL_FACTOR[p.goal]
  if (p.goal === 'fettabbau') kcal = Math.max(kcal, tdee(p) - 750)
  kcal = Math.round((kcal + adjustment) / 10) * 10
  const protein = Math.round(p.weightKg * (p.goal === 'fettabbau' ? 2.2 : 2.0))
  const fat = Math.round(Math.max(p.weightKg * 0.8, (kcal * 0.25) / 9))
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

export function macrosOf(e: Pick<FoodEntry, 'grams' | 'per100'>): Macros {
  const f = e.grams / 100
  return { kcal: e.per100.kcal * f, protein: e.per100.protein * f, carbs: e.per100.carbs * f, fat: e.per100.fat * f }
}

export function totals(entries: Pick<FoodEntry, 'grams' | 'per100'>[]): Macros {
  const ms = entries.map(macrosOf)
  return {
    kcal: sum(ms.map((m) => m.kcal)),
    protein: sum(ms.map((m) => m.protein)),
    carbs: sum(ms.map((m) => m.carbs)),
    fat: sum(ms.map((m) => m.fat)),
  }
}

/**
 * Micronutrients of a day. Returns the coverage alongside the sums, because a total is only
 * worth as much as the share of the food behind it that has data at all: an entry typed as free
 * text, a scanned product without a label, a food nobody has mapped yet. The UI has to be able
 * to say "out of 7 of your 11 entries", otherwise the number reads as the whole truth.
 */
export function microTotals(
  entries: Pick<FoodEntry, 'grams' | 'foodId'>[],
  per100: (foodId: string) => Micros | undefined,
): { totals: Micros; withData: number; entries: number } {
  const totals: Micros = {}
  let withData = 0
  for (const e of entries) {
    const m = e.foodId ? scaleMicros(per100(e.foodId), e.grams) : undefined
    if (!m) continue
    withData++
    addMicros(totals, m)
  }
  return { totals, withData, entries: entries.length }
}

/** Exponentially smoothed weight trend (like a moving average but robust to gaps). */
export function weightTrend(entries: WeightEntry[]): { date: string; kg: number; trend: number }[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  let trend: number | undefined
  let prevDate: string | undefined
  return sorted.map((e) => {
    if (trend == null || prevDate == null) trend = e.kg
    else {
      const gap = Math.max(1, daysBetween(prevDate, e.date))
      const alpha = 1 - Math.pow(0.9, gap)
      trend = trend + alpha * (e.kg - trend)
    }
    prevDate = e.date
    return { date: e.date, kg: e.kg, trend }
  })
}

/** Weekly rate of change of the trend in kg over the last `days` days. */
export function weeklyRate(entries: WeightEntry[], days = 21): number | undefined {
  const t = weightTrend(entries)
  if (t.length < 2) return undefined
  const end = t[t.length - 1]
  const cutoff = addDays(end.date, -days)
  const start = t.find((x) => x.date >= cutoff) ?? t[0]
  const span = daysBetween(start.date, end.date)
  if (span < 7) return undefined
  return ((end.trend - start.trend) / span) * 7
}

/** Target weekly change in kg. */
export function goalRate(p: Profile): number {
  switch (p.goal) {
    case 'fettabbau':
      return -0.006 * p.weightKg
    case 'muskelaufbau':
      return p.level === 'anfaenger' ? 0.0035 * p.weightKg : 0.0025 * p.weightKg
    case 'kraft':
      return 0.0015 * p.weightKg
    default:
      return -0.0015 * p.weightKg
  }
}

/**
 * Smart calorie adjustment: compare real trend with the goal rate.
 * 1 kg body mass ~ 7700 kcal; corrections are capped at +-250 kcal per check.
 */
export type AdjustmentKind = 'need_data' | 'on_track' | 'increase' | 'decrease'

export function suggestAdjustment(p: Profile, weights: WeightEntry[]): { delta: number; rate?: number; goal: number; kind: AdjustmentKind } {
  const goal = goalRate(p)
  const rate = weeklyRate(weights)
  if (rate == null) return { delta: 0, goal, kind: 'need_data' }
  const diff = goal - rate
  const raw = (diff * 7700) / 7
  const delta = Math.abs(raw) < 60 ? 0 : Math.round(Math.max(-250, Math.min(250, raw)) / 10) * 10
  return { delta, rate, goal, kind: delta === 0 ? 'on_track' : delta > 0 ? 'increase' : 'decrease' }
}

export function burnedToday(cardio: CardioEntry[], day = today()): number {
  return sum(cardio.filter((c) => c.date === day).map((c) => c.kcal))
}

export interface ParsedItem {
  text: string
  grams: number
  food?: Food
}

type ParseLang = 'de' | 'en' | 'vi'

/** Lowercase, strip accents (ä -> a, ức -> uc, đ -> d), keep letters/digits/spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Word variants for matching: German and English plurals; Vietnamese has none. */
function stems(w: string, lang: ParseLang): string[] {
  if (lang === 'de') return [w, w.replace(/(ern|er|en|n|e|s)$/, '')]
  if (lang === 'en') return [w, w.replace(/(es|s)$/, '')]
  return [w]
}

function namesOf(f: Food): string[] {
  return [...(f.names ? [f.names.de, f.names.en, f.names.vi] : [f.name]), ...(f.aliases ?? [])]
}

export function matchFood(query: string, foods: Food[], lang: ParseLang = 'de'): Food | undefined {
  const q = normalize(query)
  if (!q) return undefined
  const words = q.split(' ')
  let best: { f: Food; score: number } | undefined
  for (const f of foods) {
    const own = f.names?.[lang] ?? f.name
    for (const name of namesOf(f)) {
      const n = normalize(name)
      let score = 0
      // closer matches win: "cơm" is plain rice, not "cơm tấm sườn"
      const cover = q.length / n.length
      if (n === q) score = 100
      else if (n.startsWith(q)) score = 60 + 30 * cover
      else if (n.includes(q)) score = 40 + 30 * cover
      else {
        // word-boundary match with simple plural stemming (Eier -> Ei, eggs -> egg)
        const tokens = n.split(' ')
        let hits = 0
        for (const w of words) {
          const st = stems(w, lang).filter((x) => x.length >= 2)
          if (tokens.some((t) => st.includes(t))) hits += 1.2
          else if (tokens.some((t) => st.some((x) => t.startsWith(x) && x.length >= 3))) hits += 1
        }
        if (!hits) continue
        score = (hits / words.length) * 50
      }
      // prefer the name in the user's language and dishes of the user's cuisine
      if (name === own || f.aliases?.includes(name)) score += 5
      // the user's cuisine only breaks ties
      if (f.region && f.region === lang) score += 0.5
      if (!best || score > best.score) best = { f, score }
    }
  }
  return best?.f
}

const UNIT_GRAMS: Record<string, number> = { kg: 1000, g: 1, gr: 1, gramm: 1, gram: 1, grams: 1, ml: 1, l: 1000 }
/** count words: the number means "portions" (1 quả trứng, 2 Stück, 3 x) */
const COUNT_WORDS = ['x', 'stk', 'stück', 'stueck', 'pcs', 'pc', 'piece', 'pieces', 'quả', 'qua', 'trái', 'trai', 'cái', 'cai', 'tô', 'to', 'bát', 'bat', 'chén', 'chen', 'đĩa', 'dia', 'ly', 'cốc', 'coc', 'lát', 'lat', 'muỗng', 'muong', 'miếng', 'mieng', 'cuốn', 'cuon', 'ổ', 'o', 'gói', 'goi', 'hũ', 'hu', 'lon', 'chai', 'củ', 'cu', 'phần', 'phan', 'bowl', 'bowls', 'slice', 'slices', 'cup', 'cups', 'glass', 'glasses', 'can', 'cans']
// JS \b only knows ASCII letters, so "và" needs explicit whitespace around it
const SEPARATORS = /,|\s(?:und|and|và)\s|\+|\n|;/i

/**
 * Natural-language logging in de/en/vi: "200g Hähnchen, 2 Eier und 1 Banane",
 * "150g chicken breast and 2 eggs", "1 tô phở bò và 2 quả trứng".
 * Counts without a weight unit use the food's typical portion.
 */
export function parseMealText(text: string, foods: Food[], lang: ParseLang = 'de'): ParsedItem[] {
  const portion = (f?: Food) => (f ? (lang === 'vi' && f.viPortion ? f.viPortion.grams : f.portion) : undefined)
  return text
    .split(SEPARATORS)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+(?:[.,]\d+)?)\s*(\S+)?\s*(.*)$/u)
      if (!m) {
        const food = matchFood(part, foods, lang)
        return { text: part, grams: portion(food) ?? 100, food }
      }
      const qty = parseFloat(m[1].replace(',', '.'))
      let unit = (m[2] ?? '').toLowerCase().replace(/\.$/, '')
      let name = m[3]
      // "200g" with the unit glued on is handled by \s*; a bare count ("2 eggs") puts the food word in `unit`
      if (!(unit in UNIT_GRAMS) && !COUNT_WORDS.includes(unit)) {
        name = `${m[2] ?? ''} ${name}`.trim()
        unit = ''
      }
      const food = matchFood(name, foods, lang)
      const grams = unit in UNIT_GRAMS ? qty * UNIT_GRAMS[unit] : qty * (portion(food) ?? 100)
      return { text: part, grams: Math.round(grams), food }
    })
}
