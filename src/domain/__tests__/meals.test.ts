import { describe, expect, it } from 'vitest'
import { FOODS } from '../foods'
import { allDishFoodIds, DEFAULT_MEAL_PREFS, dishDiet, dishMacros, DISH_BY_ID, DISHES, planDays, shoppingList, suggestDishes, type MealPrefs } from '../meals'
import { DISH_TEXT } from '../../i18n/content/dishes'
import { addDays } from '../util'

const foods = new Map(FOODS.map((f) => [f.id, f]))
const week = Array.from({ length: 7 }, (_, i) => addDays('2026-10-26', i))
const target = { kcal: 2600, protein: 150, carbs: 300, fat: 80 }
const sum = (xs: { kcal: number; protein: number }[]) => xs.reduce((a, x) => ({ kcal: a.kcal + x.kcal, protein: a.protein + x.protein }), { kcal: 0, protein: 0 })

function dayTotals(plan: ReturnType<typeof planDays>, prefs: MealPrefs) {
  return week.map((d) => sum(plan.filter((p) => p.date === d).map((p) => dishMacros(DISH_BY_ID.get(p.dishId)!, foods, prefs, p.factor))))
}

describe('meal planner', () => {
  it('every dish uses known foods and has texts in all languages', () => {
    expect(allDishFoodIds().filter((id) => !foods.has(id))).toEqual([])
    for (const d of DISHES) for (const lang of ['de', 'en', 'vi'] as const) expect(DISH_TEXT[d.id][lang][1].length, `${d.id} ${lang}`).toBeGreaterThan(0)
    // enough choice for every diet and meal
    for (const diet of ['vegan', 'vegetarisch', 'alles'] as const) {
      const pool = DISHES.filter((d) => ['vegan', 'vegetarisch', 'pescetarisch', 'alles'].indexOf(dishDiet(d)) <= ['vegan', 'vegetarisch', 'pescetarisch', 'alles'].indexOf(diet))
      for (const slot of ['fruehstueck', 'mittag', 'abend', 'snack'] as const) expect(pool.filter((d) => d.slots.includes(slot)).length, `${diet} ${slot}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('derives the diet from the ingredients', () => {
    expect(dishDiet(DISH_BY_ID.get('pho-ga')!)).toBe('alles')
    expect(dishDiet(DISH_BY_ID.get('lachs-teriyaki')!)).toBe('pescetarisch')
    expect(dishDiet(DISH_BY_ID.get('overnight-oats')!)).toBe('vegetarisch')
    expect(dishDiet(DISH_BY_ID.get('tofu-pfanne')!)).toBe('vegan')
  })

  it('plans a week that hits kcal and protein, deterministic per seed', () => {
    const plan = planDays(week, target, DEFAULT_MEAL_PREFS, foods, { seed: 1 })
    expect(plan.filter((p) => p.meal !== 'snack')).toHaveLength(21)
    for (const t of dayTotals(plan, DEFAULT_MEAL_PREFS)) {
      expect(Math.abs(t.kcal - target.kcal) / target.kcal).toBeLessThan(0.1)
      expect(t.protein).toBeGreaterThan(target.protein * 0.85)
    }
    expect(planDays(week, target, DEFAULT_MEAL_PREFS, foods, { seed: 1 })).toEqual(plan)
    expect(planDays(week, target, DEFAULT_MEAL_PREFS, foods, { seed: 2 })).not.toEqual(plan)
    // variety: no main dish more than twice a week
    const counts = new Map<string, number>()
    plan.filter((p) => p.meal !== 'snack').forEach((p) => counts.set(p.dishId, (counts.get(p.dishId) ?? 0) + 1))
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2)
  })

  it('respects vegan, no nuts and lactose-free', () => {
    const prefs: MealPrefs = { ...DEFAULT_MEAL_PREFS, diet: 'vegan', noNuts: true }
    const plan = planDays(week, target, prefs, foods, { seed: 3 })
    expect(plan.every((p) => dishDiet(DISH_BY_ID.get(p.dishId)!) === 'vegan')).toBe(true)
    expect(plan.some((p) => DISH_BY_ID.get(p.dishId)!.items.some(([id]) => id === 'erdnussbutter' || id === 'walnuesse'))).toBe(false)
    const lf = shoppingList([{ id: 'x', date: week[0], meal: 'fruehstueck', dishId: 'overnight-oats', factor: 1 }], { lactoseFree: true })
    expect(lf.items.map((i) => i.foodId)).toEqual(expect.arrayContaining(['milch-laktosefrei', 'skyr-laktosefrei']))
    expect(lf.items.map((i) => i.foodId)).not.toContain('milch-15')
  })

  it('meal prep keeps the same lunch up to three days', () => {
    const plan = planDays(week, target, { ...DEFAULT_MEAL_PREFS, mealPrep: true }, foods, { seed: 4 })
    const lunches = week.map((d) => plan.find((p) => p.date === d && p.meal === 'mittag')!.dishId)
    expect(lunches[1]).toBe(lunches[0])
    let run = 1
    for (let i = 1; i < lunches.length; i++) {
      run = lunches[i] === lunches[i - 1] ? run + 1 : 1
      expect(run).toBeLessThanOrEqual(3)
    }
  })

  it('sums the shopping list over the planned portions', () => {
    const planned = [
      { id: 'a', date: week[0], meal: 'mittag' as const, dishId: 'com-ga', factor: 1 },
      { id: 'b', date: week[1], meal: 'mittag' as const, dishId: 'com-ga', factor: 1.5 },
    ]
    const list = shoppingList(planned, DEFAULT_MEAL_PREFS)
    expect(list.items.find((i) => i.foodId === 'reis-roh')?.grams).toBe(110 + 165)
    expect(list.extras).toContain('ingwer')
    expect(list.items[0].category).toBe('gemuese')
  })

  it('suggests dishes that fill the rest of the day', () => {
    const s = suggestDishes({ kcal: 700, protein: 45, carbs: 80, fat: 20 }, DEFAULT_MEAL_PREFS, foods)
    expect(s).toHaveLength(3)
    for (const x of s) expect(Math.abs(x.macros.kcal - 700)).toBeLessThan(200)
    expect(suggestDishes({ kcal: 300, protein: 25, carbs: 30, fat: 8 }, DEFAULT_MEAL_PREFS, foods).every((x) => x.dish.slots.includes('snack'))).toBe(true)
    expect(suggestDishes({ kcal: 80, protein: 5, carbs: 5, fat: 2 }, DEFAULT_MEAL_PREFS, foods)).toEqual([])
  })
})
