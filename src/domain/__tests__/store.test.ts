import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store'
import { streak } from '../stats'
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
    expect(streak(useStore.getState())).toBe(1)
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
