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
export function suggestAdjustment(p: Profile, weights: WeightEntry[]): { delta: number; rate?: number; goal: number; text: string } {
  const goal = goalRate(p)
  const rate = weeklyRate(weights)
  if (rate == null) return { delta: 0, goal, text: 'Wiege dich mindestens 2 Wochen lang regelmäßig, dann passt die App deine Kalorien an.' }
  const diff = goal - rate
  const raw = (diff * 7700) / 7
  const delta = Math.abs(raw) < 60 ? 0 : Math.round(Math.max(-250, Math.min(250, raw)) / 10) * 10
  const text =
    delta === 0
      ? 'Du liegst im Zielkorridor. Kalorien bleiben gleich.'
      : delta > 0
        ? `Dein Trend liegt unter dem Ziel. Vorschlag: +${delta} kcal pro Tag.`
        : `Dein Trend liegt über dem Ziel. Vorschlag: ${delta} kcal pro Tag.`
  return { delta, rate, goal, text }
}

export function burnedToday(cardio: CardioEntry[], day = today()): number {
  return sum(cardio.filter((c) => c.date === day).map((c) => c.kcal))
}

export interface ParsedItem {
  text: string
  grams: number
  food?: Food
}

const UNIT_GRAMS: Record<string, number> = { kg: 1000, g: 1, gr: 1, gramm: 1, ml: 1, l: 1000 }

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchFood(query: string, foods: Food[]): Food | undefined {
  const q = normalize(query)
  if (!q) return undefined
  const words = q.split(' ')
  let best: { f: Food; score: number } | undefined
  for (const f of foods) {
    const n = normalize(f.name)
    let score = 0
    if (n === q) score = 100
    else if (n.startsWith(q)) score = 80
    else if (n.includes(q)) score = 60
    else {
      // word-boundary match with simple German plural stemming (Eier -> Ei, Bananen -> Banane)
      const tokens = n.split(' ')
      let hits = 0
      for (const w of words) {
        const stems = [w, w.replace(/(ern|er|en|n|e|s)$/, '')].filter((x) => x.length >= 2)
        if (tokens.some((t) => stems.includes(t))) hits += 1.2
        else if (tokens.some((t) => stems.some((st) => t.startsWith(st) && st.length >= 3))) hits += 1
      }
      if (!hits) continue
      score = (hits / words.length) * 50
    }
    score -= n.length / 100
    if (!best || score > best.score) best = { f, score }
  }
  return best?.f
}

/**
 * Natural-language logging: "200g Hähnchen, 2 Eier und 1 Banane".
 * Counts without unit use the food's typical portion.
 */
export function parseMealText(text: string, foods: Food[]): ParsedItem[] {
  return text
    .split(/,|\bund\b|\+|\n|;/i)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+(?:[.,]\d+)?)\s*(kg|gramm|gr|g|ml|l|x|stk|stück|stueck)?\.?\s+(.*)$/i)
      if (!m) {
        const food = matchFood(part, foods)
        return { text: part, grams: food?.portion ?? 100, food }
      }
      const qty = parseFloat(m[1].replace(',', '.'))
      const unit = (m[2] ?? '').toLowerCase()
      const name = m[3]
      const food = matchFood(name, foods)
      const grams = unit in UNIT_GRAMS ? qty * UNIT_GRAMS[unit] : qty * (food?.portion ?? 100)
      return { text: part, grams: Math.round(grams), food }
    })
}
