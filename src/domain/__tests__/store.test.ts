import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store'
import { flamesOf } from '../motivation'
import { addDays, today } from '../util'

const per100 = { kcal: 100, protein: 10, carbs: 10, fat: 1 }

describe('store: recipes, supplements, measurements', () => {
  beforeEach(() => useStore.getState().reset())

  it('logs a recipe scaled by portions', () => {
    const s = useStore.getState()
    s.saveRecipe({ id: 'r1', name: 'Porridge', servings: 2, items: [{ name: 'Hafer', grams: 100, per100 }, { name: 'Milch', grams: 300, per100 }] })
    useStore.getState().logRecipe(useStore.getState().recipes[0], 1, today(), 'fruehstueck')
    expect(useStore.getState().foods.map((f) => f.grams)).toEqual([50, 150])
  })

  it('copies yesterday\'s meal', () => {
    const y = addDays(today(), -1)
    useStore.getState().addFood({ date: y, meal: 'mittag', name: 'Reis', grams: 200, per100 })
    useStore.getState().addFood({ date: y, meal: 'abend', name: 'Brot', grams: 80, per100 })
    expect(useStore.getState().copyMeal(y, today(), 'mittag')).toBe(1)
    expect(useStore.getState().foods.filter((f) => f.date === today()).map((f) => f.name)).toEqual(['Reis'])
  })

  it('toggles supplements per day and counts them as activity', () => {
    useStore.getState().addSupplement({ name: 'Kreatin', dose: '5 g' })
    const id = useStore.getState().supplements[0].id
    useStore.getState().toggleSupplement(id)
    expect(useStore.getState().supplementLog[today()]).toEqual([id])
    // logging supplements is no activity: the flame stays out
    expect(flamesOf(useStore.getState()).daily.count).toBe(0)
    useStore.getState().toggleSupplement(id)
    expect(useStore.getState().supplementLog[today()]).toEqual([])
  })

  it('keeps one measurement per day, sorted', () => {
    useStore.getState().logMeasurement({ date: today(), values: { taille: 82 } })
    useStore.getState().logMeasurement({ date: addDays(today(), -14), values: { taille: 84 } })
    useStore.getState().logMeasurement({ date: today(), values: { taille: 81.5 } })
    expect(useStore.getState().measurements.map((m) => m.values.taille)).toEqual([84, 81.5])
  })
})

describe('store: planned meals', () => {
  beforeEach(() => useStore.getState().reset())
  const slot = { id: '2026-11-02|mittag|0', date: '2026-11-02', meal: 'mittag' as const, dishId: 'd', factor: 1 }
  const entries = (...names: string[]) => names.map((name) => ({ date: slot.date, meal: slot.meal, name, grams: 100, per100 }))

  it('books a planned meal as a unit with deterministic ids', () => {
    useStore.getState().setMealPlan([slot.date], [slot])
    useStore.getState().addFood({ date: slot.date, meal: 'mittag', name: 'Apfel', grams: 100, per100 })
    useStore.getState().logPlannedMeal(slot.id, entries('Reis', 'Huhn'))
    const s = useStore.getState()
    const booking = s.mealPlan[0].booking!
    expect(s.mealPlan[0]).toMatchObject({ logged: true, booking })
    expect(s.foods.filter((f) => f.planSlot).map((f) => [f.id, f.booking])).toEqual([
      [`mp:${slot.id}:${booking}:0`, booking],
      [`mp:${slot.id}:${booking}:1`, booking],
    ])
    // booking the slot again replaces its entries, other entries stay
    useStore.getState().logPlannedMeal(slot.id, entries('Nudeln'))
    expect(useStore.getState().foods.map((f) => f.name)).toEqual(['Apfel', 'Nudeln'])
  })

  it('a copied planned meal is an ordinary entry, re-booking the slot keeps it', () => {
    useStore.getState().setMealPlan([slot.date], [slot])
    useStore.getState().logPlannedMeal(slot.id, entries('Reis'))
    useStore.getState().copyMeal(slot.date, '2026-11-03', 'mittag')
    const copy = useStore.getState().foods.find((f) => f.date === '2026-11-03')!
    expect(copy.planSlot).toBeUndefined()
    expect(copy.booking).toBeUndefined()
    useStore.getState().logPlannedMeal(slot.id, entries('Nudeln'))
    expect(useStore.getState().foods.map((f) => [f.date, f.name])).toEqual([['2026-11-03', 'Reis'], ['2026-11-02', 'Nudeln']])
  })
})
