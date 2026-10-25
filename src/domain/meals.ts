import type { Food, Macros, Meal } from './types'

/**
 * Meal planner: built-in dishes and the logic that turns them into a week plan.
 *
 * Dishes come from two sources: the athlete meal plan in repos/Fitness (08_Speiseplan, mostly Asian,
 * lactose-free capable, values per portion recalculated from raw weights) and the vegan collection in
 * repos/cooking (amounts converted to grams per serving, a few adapted for more protein: soy drink
 * instead of light coconut milk, more lentils). Macros are always computed from the food database, so a
 * planned dish and the logged diary entry show the same numbers.
 */

export type Diet = 'vegan' | 'vegetarisch' | 'pescetarisch' | 'alles'

export interface MealPrefs {
  diet: Diet
  lactoseFree: boolean
  noNuts: boolean
  noPork: boolean
  /** only dishes ready in 20 minutes */
  quick: boolean
  /** cook lunch for up to three days in a row */
  mealPrep: boolean
}

export const DEFAULT_MEAL_PREFS: MealPrefs = { diet: 'alles', lactoseFree: false, noNuts: false, noPork: false, quick: false, mealPrep: false }

/** Unweighed extras for the shopping list (spices, herbs, citrus). */
export type Extra = 'knoblauch' | 'ingwer' | 'limette' | 'zitrone' | 'chili' | 'kraeuter' | 'koriander' | 'basilikum' | 'sternanis' | 'kurkuma' | 'nori' | 'matcha' | 'reisessig' | 'paprikapulver' | 'reispapier'

export type Cuisine = 'vn' | 'kr' | 'th' | 'jp' | 'cn' | 'de' | 'med' | 'fusion'

interface DishDef {
  slots: Meal[]
  /** food id and grams for one portion */
  items: [string, number][]
  extras?: Extra[]
  minutes: number
  /** days it keeps in the fridge (meal prep) */
  keeps?: number
  cuisine: Cuisine
}

const DISH_DEFS = {
  // from the athlete plan (Fitness/08)
  'pho-ga': { slots: ['mittag', 'abend'], items: [['reisnudeln-roh', 100], ['haehnchenbrust', 110], ['bruehe', 450], ['gia-do', 50], ['zwiebel', 30], ['nuoc-mam', 8], ['salat', 15]], extras: ['ingwer', 'sternanis', 'limette', 'kraeuter', 'chili'], minutes: 30, keeps: 3, cuisine: 'vn' },
  'bun-bo-xao': { slots: ['mittag', 'abend'], items: [['reisnudeln-roh', 90], ['rind-mager', 110], ['salat', 50], ['gurke', 60], ['karotte', 30], ['dau-phong', 15], ['rapsoel', 10], ['nuoc-mam', 15], ['zucker', 8]], extras: ['knoblauch', 'limette', 'chili', 'kraeuter'], minutes: 25, keeps: 2, cuisine: 'vn' },
  'com-ga': { slots: ['mittag', 'abend'], items: [['reis-roh', 110], ['haehnchenschenkel', 130], ['gurke', 70], ['tomate', 70], ['rapsoel', 8], ['sojasauce', 10], ['zwiebel', 20]], extras: ['ingwer', 'knoblauch', 'limette'], minutes: 35, keeps: 2, cuisine: 'vn' },
  'goi-cuon': { slots: ['mittag', 'abend'], items: [['garnelen', 150], ['reisnudeln-roh', 70], ['salat', 40], ['karotte', 20], ['gurke', 30], ['dau-phong', 10], ['nuoc-mam', 15], ['zucker', 4]], extras: ['reispapier', 'limette', 'kraeuter', 'knoblauch', 'chili'], minutes: 30, keeps: 1, cuisine: 'vn' },
  'banh-mi-trung': { slots: ['fruehstueck', 'snack'], items: [['banh-mi-khong', 100], ['ei', 110], ['gurke', 40], ['karotte', 30], ['salat', 15], ['rapsoel', 5], ['sojasauce', 5]], extras: ['koriander', 'chili'], minutes: 10, cuisine: 'vn' },
  bibimbap: { slots: ['mittag', 'abend'], items: [['reis-roh', 110], ['rind-mager', 90], ['spinat', 60], ['karotte', 50], ['gia-do', 50], ['ei', 55], ['kimchi', 40], ['rapsoel', 8], ['gochujang', 15]], extras: ['knoblauch'], minutes: 35, keeps: 2, cuisine: 'kr' },
  'bulgogi-bowl': { slots: ['mittag', 'abend'], items: [['rind-mager', 130], ['zwiebel', 40], ['paprika', 60], ['sojasauce', 15], ['zucker', 5], ['rapsoel', 12], ['reis-roh', 90], ['kimchi', 40], ['sesam', 3]], extras: ['knoblauch', 'ingwer'], minutes: 30, keeps: 2, cuisine: 'kr' },
  'pad-kra-pao': { slots: ['mittag', 'abend'], items: [['reis-roh', 110], ['haehnchenbrust', 120], ['gruene-bohnen', 80], ['paprika', 50], ['rapsoel', 10], ['sojasauce', 10], ['austernsauce', 10], ['zucker', 4], ['ei', 55], ['zwiebel', 20]], extras: ['basilikum', 'chili', 'knoblauch'], minutes: 25, keeps: 3, cuisine: 'th' },
  'lachs-teriyaki': { slots: ['mittag', 'abend'], items: [['reis-roh', 110], ['lachs', 110], ['sojasauce', 15], ['mirin', 15], ['zucker', 5], ['brokkoli', 120], ['edamame', 40], ['sesam', 3], ['rapsoel', 3]], extras: ['ingwer'], minutes: 25, keeps: 2, cuisine: 'jp' },
  'mapo-tofu': { slots: ['mittag', 'abend'], items: [['reis-roh', 110], ['tofu', 200], ['rinderhack-mager', 40], ['doubanjiang', 15], ['bruehe', 100], ['speisestaerke', 5], ['rapsoel', 8], ['zwiebel', 30], ['rau-cai', 100]], extras: ['knoblauch', 'ingwer', 'chili'], minutes: 25, keeps: 3, cuisine: 'cn' },
  congee: { slots: ['fruehstueck', 'abend'], items: [['reis-roh', 70], ['haehnchenbrust', 90], ['ei', 55], ['sojasauce', 8], ['rapsoel', 5], ['zwiebel', 20], ['rau-cai', 80]], extras: ['ingwer'], minutes: 60, keeps: 3, cuisine: 'cn' },
  'tomaten-ruehrei': { slots: ['mittag', 'abend'], items: [['reis-roh', 110], ['ei', 115], ['tomate', 200], ['rapsoel', 8], ['zucker', 3], ['zwiebel', 20], ['edamame', 40]], minutes: 20, keeps: 2, cuisine: 'cn' },
  'overnight-oats': { slots: ['fruehstueck'], items: [['haferflocken', 80], ['milch-15', 200], ['skyr', 100], ['banane', 100], ['erdnussbutter', 15], ['honig', 8]], minutes: 5, keeps: 3, cuisine: 'de' },
  'ruehrei-brot': { slots: ['fruehstueck'], items: [['ei', 165], ['vollkornbrot', 100], ['rapsoel', 5], ['tomate', 80], ['orangensaft', 150]], minutes: 10, cuisine: 'de' },
  'skyr-bowl': { slots: ['fruehstueck', 'snack'], items: [['skyr', 200], ['haferflocken', 40], ['beeren-tk', 100], ['honig', 10]], minutes: 3, cuisine: 'de' },
  onigiri: { slots: ['snack'], items: [['reis-roh', 80], ['thunfisch-dose', 45], ['sojasauce', 5]], extras: ['nori'], minutes: 20, keeps: 1, cuisine: 'jp' },
  'protein-pudding': { slots: ['snack'], items: [['magerquark', 250], ['proteinpulver', 20], ['kakao', 8], ['honig', 10]], minutes: 5, keeps: 2, cuisine: 'de' },
  'edamame-snack': { slots: ['snack'], items: [['edamame', 150]], minutes: 5, keeps: 2, cuisine: 'jp' },
  'brot-erdnuss-banane': { slots: ['snack', 'fruehstueck'], items: [['vollkornbrot', 70], ['erdnussbutter', 15], ['banane', 120]], minutes: 3, cuisine: 'de' },
  'eier-banane': { slots: ['snack'], items: [['ei', 110], ['banane', 100]], minutes: 12, keeps: 2, cuisine: 'de' },
  'whey-shake': { slots: ['snack'], items: [['proteinpulver', 30], ['milch-15', 300]], minutes: 2, cuisine: 'de' },
  'soja-protein-shake': { slots: ['snack'], items: [['sojaprotein', 30], ['sua-dau-nanh', 300], ['banane', 60]], minutes: 2, cuisine: 'de' },
  'soja-shake': { slots: ['snack'], items: [['sua-dau-nanh', 250], ['banane', 120], ['haferflocken', 15]], minutes: 3, cuisine: 'de' },
  // vegan collection (cooking), per serving
  'gochujang-tofu-bowl': { slots: ['mittag', 'abend'], items: [['tofu', 150], ['reis-gekocht', 150], ['edamame', 50], ['gurke', 120], ['karotte', 40], ['spinat', 20], ['olivenoel', 7], ['sesam', 5], ['gochujang', 9], ['sojasauce', 8], ['ahornsirup', 3], ['speisestaerke', 4]], extras: ['knoblauch', 'ingwer', 'reisessig'], minutes: 30, keeps: 2, cuisine: 'kr' },
  'tofu-erdnuss-nudeln': { slots: ['mittag', 'abend'], items: [['tofu', 125], ['brokkoli', 100], ['reisnudeln-roh', 75], ['paprika', 75], ['sesam', 5], ['erdnussbutter', 16], ['sojasauce', 8], ['ahornsirup', 3], ['gochujang', 3], ['speisestaerke', 4]], extras: ['knoblauch', 'ingwer', 'koriander', 'reisessig'], minutes: 30, keeps: 2, cuisine: 'fusion' },
  'kokos-curry': { slots: ['abend', 'mittag'], items: [['tofu', 150], ['champignons', 75], ['blumenkohl', 125], ['zwiebel', 40], ['kokosmilch-light', 200], ['bruehe', 100], ['misopaste', 8], ['olivenoel', 7], ['reis-roh', 60]], extras: ['kurkuma', 'ingwer', 'knoblauch', 'chili', 'zitrone', 'koriander'], minutes: 35, keeps: 3, cuisine: 'fusion' },
  'kichererbsen-bowl': { slots: ['mittag'], items: [['kichererbsen-dose', 120], ['avocado', 75], ['olivenoel', 7], ['gurke', 80], ['tomate', 80], ['salat', 20], ['hanfsamen', 5], ['vollkornbrot', 60]], extras: ['zitrone', 'knoblauch', 'kraeuter'], minutes: 5, keeps: 1, cuisine: 'med' },
  'chia-pudding': { slots: ['fruehstueck', 'snack'], items: [['chiasamen', 18], ['leinsamen', 4], ['kokosmilch-light', 125], ['kakao', 4], ['ahornsirup', 3], ['walnuesse', 20], ['beeren-tk', 40]], minutes: 10, keeps: 3, cuisine: 'fusion' },
  'matcha-oats': { slots: ['fruehstueck'], items: [['haferflocken', 50], ['chiasamen', 6], ['leinsamen', 4], ['sua-dau-nanh', 200], ['ahornsirup', 3], ['beeren-tk', 50], ['walnuesse', 8], ['hanfsamen', 5]], extras: ['matcha'], minutes: 10, keeps: 3, cuisine: 'fusion' },
  'tofu-pfanne': { slots: ['mittag', 'abend'], items: [['tofu', 150], ['brokkoli', 100], ['paprika', 75], ['champignons', 75], ['olivenoel', 7], ['gochujang', 9], ['sojasauce', 8], ['ahornsirup', 3], ['reis-gekocht', 150]], extras: ['knoblauch', 'ingwer', 'reisessig'], minutes: 15, keeps: 3, cuisine: 'kr' },
  'bohnen-blech': { slots: ['mittag', 'abend'], items: [['brokkoli', 120], ['blumenkohl', 120], ['weisse-bohnen-dose', 100], ['tomate', 80], ['zwiebel', 40], ['olivenoel', 11], ['hanfsamen', 4]], extras: ['knoblauch', 'paprikapulver', 'zitrone', 'kraeuter'], minutes: 35, keeps: 3, cuisine: 'med' },
  'linsen-paprika': { slots: ['abend', 'mittag'], items: [['paprika', 180], ['linsen-braun-roh', 50], ['champignons', 100], ['zwiebel', 40], ['olivenoel', 7], ['hanfsamen', 5], ['spinat', 20], ['sojajoghurt', 30]], extras: ['knoblauch', 'paprikapulver', 'kraeuter', 'zitrone'], minutes: 45, keeps: 3, cuisine: 'med' },
  'gruener-smoothie': { slots: ['snack', 'fruehstueck'], items: [['banane', 120], ['spinat', 30], ['beeren-tk', 150], ['leinsamen', 7], ['hanfsamen', 10], ['erdnussbutter', 15], ['sua-dau-nanh', 200]], extras: ['matcha'], minutes: 3, cuisine: 'fusion' },
  'sesam-nudeln': { slots: ['mittag', 'abend'], items: [['reisnudeln-roh', 75], ['gurke', 120], ['paprika', 75], ['edamame', 50], ['karotte', 40], ['sesam', 5], ['erdnussbutter', 16], ['sojasauce', 8], ['ahornsirup', 3], ['gochujang', 3]], extras: ['knoblauch', 'ingwer', 'koriander', 'reisessig'], minutes: 20, keeps: 2, cuisine: 'fusion' },
  'tofu-salat': { slots: ['abend', 'mittag'], items: [['tofu', 100], ['edamame', 75], ['paprika', 75], ['gurke', 120], ['karotte', 40], ['zwiebel', 30], ['salat', 20], ['sesam', 5], ['erdnussbutter', 16], ['sojasauce', 8], ['ahornsirup', 3], ['gochujang', 3]], extras: ['ingwer', 'knoblauch', 'koriander', 'reisessig'], minutes: 10, keeps: 1, cuisine: 'fusion' },
} satisfies Record<string, DishDef>

export type DishId = keyof typeof DISH_DEFS
export interface Dish extends DishDef {
  id: DishId
}
export const DISHES: Dish[] = (Object.entries(DISH_DEFS) as [DishId, DishDef][]).map(([id, d]) => ({ id, ...d }))
export const DISH_BY_ID = new Map<string, Dish>(DISHES.map((d) => [d.id, d]))

/** Animal products by food id; anything not listed is plant-based. */
const ANIMAL: Record<string, 'fleisch' | 'fisch' | 'ei' | 'milch' | 'honig'> = {
  haehnchenbrust: 'fleisch', haehnchenschenkel: 'fleisch', putenbrust: 'fleisch', 'rind-mager': 'fleisch', 'rinderhack-mager': 'fleisch', rinderhack: 'fleisch', rindersteak: 'fleisch', schweinefilet: 'fleisch', kochschinken: 'fleisch', salami: 'fleisch',
  lachs: 'fisch', 'thunfisch-dose': 'fisch', garnelen: 'fisch', kabeljau: 'fisch', 'nuoc-mam': 'fisch', austernsauce: 'fisch',
  ei: 'ei', eiklar: 'ei',
  'milch-15': 'milch', 'milch-35': 'milch', 'milch-laktosefrei': 'milch', skyr: 'milch', 'skyr-laktosefrei': 'milch', magerquark: 'milch', 'magerquark-laktosefrei': 'milch', proteinpulver: 'milch', butter: 'milch',
  honig: 'honig',
}
const PORK = new Set(['schweinefilet', 'kochschinken', 'salami'])
const NUTS = new Set(['erdnussbutter', 'dau-phong', 'walnuesse', 'mandeln', 'cashew'])
/** lactose-free mode swaps dairy for its lactose-free twin (same macros) */
const LACTOSE_FREE: Record<string, string> = { 'milch-15': 'milch-laktosefrei', skyr: 'skyr-laktosefrei', magerquark: 'magerquark-laktosefrei' }

const DIET_RANK: Record<Diet, number> = { vegan: 0, vegetarisch: 1, pescetarisch: 2, alles: 3 }

export function dishDiet(d: Pick<Dish, 'items'>): Diet {
  const kinds = new Set(d.items.map(([id]) => ANIMAL[id]).filter(Boolean))
  if (kinds.has('fleisch')) return 'alles'
  if (kinds.has('fisch')) return 'pescetarisch'
  if (kinds.size) return 'vegetarisch'
  return 'vegan'
}

export function dishAllowed(d: Dish, prefs: MealPrefs): boolean {
  if (DIET_RANK[dishDiet(d)] > DIET_RANK[prefs.diet]) return false
  if (prefs.noNuts && d.items.some(([id]) => NUTS.has(id))) return false
  if (prefs.noPork && d.items.some(([id]) => PORK.has(id))) return false
  if (prefs.quick && d.minutes > 20) return false
  return true
}

/** Grams rounded the way people weigh: 5 g steps above 50 g. */
const roundGrams = (g: number) => (g >= 50 ? Math.round(g / 5) * 5 : Math.max(1, Math.round(g)))

export function dishItems(d: Pick<Dish, 'items'>, prefs: Pick<MealPrefs, 'lactoseFree'>, factor = 1): { foodId: string; grams: number }[] {
  return d.items.map(([id, g]) => ({ foodId: prefs.lactoseFree ? LACTOSE_FREE[id] ?? id : id, grams: roundGrams(g * factor) }))
}

export function dishMacros(d: Pick<Dish, 'items'>, foods: Map<string, Food>, prefs: Pick<MealPrefs, 'lactoseFree'> = DEFAULT_MEAL_PREFS, factor = 1): Macros {
  const out: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  for (const { foodId, grams } of dishItems(d, prefs, factor)) {
    const f = foods.get(foodId)
    if (!f) continue
    out.kcal += (f.per100.kcal * grams) / 100
    out.protein += (f.per100.protein * grams) / 100
    out.carbs += (f.per100.carbs * grams) / 100
    out.fat += (f.per100.fat * grams) / 100
  }
  return out
}

export interface PlannedMeal {
  /** `${date}|${meal}|${n}`: one slot per day and meal, so two devices never duplicate a slot */
  id: string
  date: string
  meal: Meal
  dishId: string
  factor: number
  logged?: boolean
}

/** Small seeded PRNG (mulberry32): the same week and seed always give the same plan. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const MAINS: Meal[] = ['fruehstueck', 'mittag', 'abend']
/** share of the main meals' kcal per meal, and the snack size assumed while picking */
const SHARE: Partial<Record<Meal, number>> = { fruehstueck: 0.27, mittag: 0.36, abend: 0.37 }
const SNACK_KCAL = 300
const round05 = (x: number) => Math.round(x * 20) / 20
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

interface PlanOpts {
  seed: number
  /** meals already planned before these days (for variety and meal prep) */
  before?: PlannedMeal[]
}

/**
 * Plans breakfast, lunch, dinner and one or two snacks per day. Main dishes are scaled together so
 * the day lands on the kcal target; the snack is chosen so protein reaches the target too (about
 * 0.4 g/kg per main meal over four meals, Schoenfeld & Aragon 2018, is what the targets imply).
 */
export function planDays(dates: string[], target: Macros, prefs: MealPrefs, foods: Map<string, Food>, opts: PlanOpts): PlannedMeal[] {
  const rand = rng(opts.seed)
  const pool = DISHES.filter((d) => dishAllowed(d, prefs))
  const base = new Map(pool.map((d) => [d.id, dishMacros(d, foods, prefs)]))
  const out: PlannedMeal[] = []
  const history = [...(opts.before ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1))

  for (const date of dates) {
    const recent = [...history, ...out]
    const lastDays = new Set(recent.filter((p) => p.date < date).slice(-10).map((p) => p.dishId))
    const count = (id: string) => recent.filter((p) => p.dishId === id).length
    // a dish that already fits its share of the day needs little scaling
    const shareKcal = (meal: Meal) => (SHARE[meal] ?? 0) * (target.kcal - SNACK_KCAL)
    const pick = (meal: Meal, taken: Set<string>): Dish | undefined => {
      const cands = pool.filter((d) => d.slots.includes(meal) && !taken.has(d.id))
      let best: Dish | undefined
      let bestScore = -Infinity
      for (const d of cands) {
        const m = base.get(d.id)!
        const density = m.kcal ? (m.protein * 4) / m.kcal : 0
        const fit = Math.abs(m.kcal - shareKcal(meal)) / shareKcal(meal)
        const score = rand() - (lastDays.has(d.id) ? 1.2 : 0) - 0.35 * count(d.id) + 2 * density - 1.2 * fit
        if (score > bestScore) {
          bestScore = score
          best = d
        }
      }
      return best
    }

    const day: { meal: Meal; dish: Dish }[] = []
    const taken = new Set<string>()
    for (const meal of MAINS) {
      let dish: Dish | undefined
      if (meal === 'mittag' && prefs.mealPrep) {
        // keep yesterday's lunch while it keeps and at most three days in a row
        const prev = [...recent].reverse().filter((p) => p.meal === 'mittag' && p.date < date)
        const last = prev[0] && DISH_BY_ID.get(prev[0].dishId)
        let streak = 0
        while (prev[streak] && prev[streak].dishId === last?.id) streak++
        if (last && base.has(last.id) && streak < Math.min(3, last.keeps ?? 1)) dish = last
      }
      dish ??= pick(meal, taken)
      if (dish) {
        day.push({ meal, dish })
        taken.add(dish.id)
      }
    }
    if (!day.length) continue

    // each main meal is scaled to its share of what the snacks leave over
    const shares = day.reduce((a, x) => a + SHARE[x.meal]!, 0)
    const scale = (budget: number) => day.map((x) => round05(clamp((SHARE[x.meal]! / shares) * budget / base.get(x.dish.id)!.kcal, 0.6, 1.8)))
    const totalsFor = (factors: number[], extra: Dish[]) => {
      let kcal = 0
      let protein = 0
      day.forEach((x, i) => {
        kcal += base.get(x.dish.id)!.kcal * factors[i]
        protein += base.get(x.dish.id)!.protein * factors[i]
      })
      for (const e of extra) {
        kcal += base.get(e.id)!.kcal
        protein += base.get(e.id)!.protein
      }
      return { kcal, protein }
    }
    const snacks = pool.filter((d) => d.slots.includes('snack') && !taken.has(d.id))
    // the snack that brings protein closest to the target once the mains fill the rest
    let snack: Dish | undefined
    let bestScore = -Infinity
    for (const sn of snacks) {
      const r = totalsFor(scale(target.kcal - base.get(sn.id)!.kcal), [sn])
      const deficit = Math.max(0, target.protein - r.protein) / Math.max(1, target.protein)
      const excess = Math.max(0, r.protein - 1.2 * target.protein) / Math.max(1, target.protein)
      const score = rand() * 0.4 - 5 * deficit - excess - Math.abs(r.kcal - target.kcal) / target.kcal - (lastDays.has(sn.id) ? 0.5 : 0)
      if (score > bestScore) {
        bestScore = score
        snack = sn
      }
    }
    const extra = snack ? [snack] : []
    let factors = scale(target.kcal - (snack ? base.get(snack.id)!.kcal : 0))
    // mains capped at 1.8x and still short: a second snack fills the gap
    const gap = target.kcal - totalsFor(factors, extra).kcal
    if (gap > 180) {
      const second = snacks.filter((x) => x.id !== snack?.id).sort((a, b) => Math.abs(base.get(a.id)!.kcal - gap) - Math.abs(base.get(b.id)!.kcal - gap))[0]
      if (second) {
        extra.push(second)
        factors = scale(target.kcal - extra.reduce((a, e) => a + base.get(e.id)!.kcal, 0))
      }
    }
    day.forEach((x, i) => out.push({ id: `${date}|${x.meal}|0`, date, meal: x.meal, dishId: x.dish.id, factor: factors[i] }))
    extra.forEach((e, i) => out.push({ id: `${date}|snack|${i}`, date, meal: 'snack', dishId: e.id, factor: 1 }))
  }
  return out
}

export interface Suggestion {
  dish: Dish
  factor: number
  macros: Macros
}

/** Dishes that fill what is still open today: close to the remaining kcal, protein first. */
export function suggestDishes(remaining: Macros, prefs: MealPrefs, foods: Map<string, Food>, n = 3): Suggestion[] {
  if (remaining.kcal < 150) return []
  const snackSize = remaining.kcal < 450
  const pool = DISHES.filter((d) => dishAllowed(d, prefs) && (snackSize ? d.slots.includes('snack') : d.slots.some((s) => s === 'mittag' || s === 'abend')))
  return pool
    .map((dish) => {
      const m = dishMacros(dish, foods, prefs)
      const factor = clamp(Math.round((remaining.kcal / m.kcal) * 4) / 4, 0.5, 1.5)
      const macros = dishMacros(dish, foods, prefs, factor)
      const score = Math.abs(macros.kcal - remaining.kcal) / remaining.kcal + (1.2 * Math.max(0, remaining.protein - macros.protein)) / Math.max(20, remaining.protein)
      return { dish, factor, macros, score }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map(({ dish, factor, macros }) => ({ dish, factor, macros }))
}

export type ShopCategory = 'gemuese' | 'obst' | 'protein' | 'milch' | 'kohlenhydrate' | 'vorrat'

const CATEGORY: Record<string, ShopCategory> = {
  'gia-do': 'gemuese', zwiebel: 'gemuese', salat: 'gemuese', gurke: 'gemuese', karotte: 'gemuese', tomate: 'gemuese', spinat: 'gemuese', paprika: 'gemuese', 'gruene-bohnen': 'gemuese', brokkoli: 'gemuese', 'rau-cai': 'gemuese', champignons: 'gemuese', blumenkohl: 'gemuese', kimchi: 'gemuese', avocado: 'gemuese',
  banane: 'obst', 'beeren-tk': 'obst', orangensaft: 'obst', xoai: 'obst',
  haehnchenbrust: 'protein', haehnchenschenkel: 'protein', 'rind-mager': 'protein', 'rinderhack-mager': 'protein', lachs: 'protein', garnelen: 'protein', 'thunfisch-dose': 'protein', ei: 'protein', tofu: 'protein', edamame: 'protein', 'kichererbsen-dose': 'protein', 'weisse-bohnen-dose': 'protein', 'linsen-braun-roh': 'protein',
  'milch-15': 'milch', 'milch-laktosefrei': 'milch', skyr: 'milch', 'skyr-laktosefrei': 'milch', magerquark: 'milch', 'magerquark-laktosefrei': 'milch', proteinpulver: 'milch', sojaprotein: 'milch', sojajoghurt: 'milch', 'sua-dau-nanh': 'milch', 'kokosmilch-light': 'milch',
  'reis-roh': 'kohlenhydrate', 'reis-gekocht': 'kohlenhydrate', 'reisnudeln-roh': 'kohlenhydrate', haferflocken: 'kohlenhydrate', vollkornbrot: 'kohlenhydrate', 'banh-mi-khong': 'kohlenhydrate',
  rapsoel: 'vorrat', olivenoel: 'vorrat', sojasauce: 'vorrat', 'nuoc-mam': 'vorrat', austernsauce: 'vorrat', gochujang: 'vorrat', doubanjiang: 'vorrat', misopaste: 'vorrat', mirin: 'vorrat', bruehe: 'vorrat', zucker: 'vorrat', ahornsirup: 'vorrat', honig: 'vorrat', speisestaerke: 'vorrat', kakao: 'vorrat', sesam: 'vorrat', erdnussbutter: 'vorrat', 'dau-phong': 'vorrat', walnuesse: 'vorrat', chiasamen: 'vorrat', leinsamen: 'vorrat', hanfsamen: 'vorrat',
}
export const SHOP_ORDER: ShopCategory[] = ['gemuese', 'obst', 'protein', 'milch', 'kohlenhydrate', 'vorrat']
export const shopCategory = (foodId: string): ShopCategory => CATEGORY[foodId] ?? 'vorrat'

export interface ShoppingItem {
  foodId: string
  grams: number
  category: ShopCategory
}

/** Everything the planned meals need, summed per food; extras listed once. */
export function shoppingList(planned: PlannedMeal[], prefs: Pick<MealPrefs, 'lactoseFree'>): { items: ShoppingItem[]; extras: Extra[] } {
  const grams = new Map<string, number>()
  const extras = new Set<Extra>()
  for (const p of planned) {
    const d = DISH_BY_ID.get(p.dishId)
    if (!d) continue
    for (const it of dishItems(d, prefs, p.factor)) grams.set(it.foodId, (grams.get(it.foodId) ?? 0) + it.grams)
    d.extras?.forEach((e) => extras.add(e))
  }
  const items = [...grams.entries()].map(([foodId, g]) => ({ foodId, grams: g, category: shopCategory(foodId) }))
  items.sort((a, b) => SHOP_ORDER.indexOf(a.category) - SHOP_ORDER.indexOf(b.category) || b.grams - a.grams)
  return { items, extras: [...extras] }
}

/** Every food id a dish can use (for tests: all must exist in the food database). */
export function allDishFoodIds(): string[] {
  const ids = new Set<string>()
  for (const d of DISHES) for (const [id] of d.items) ids.add(id)
  for (const id of Object.values(LACTOSE_FREE)) ids.add(id)
  return [...ids]
}
