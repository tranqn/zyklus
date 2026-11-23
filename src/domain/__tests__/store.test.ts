import { beforeEach, describe, expect, it } from 'vitest'
import { backupOf, useStore } from '../../store'
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

  it('eating a booked entry again (addFood/addFoods with its fields) gives an ordinary entry, re-booking keeps it', () => {
    useStore.getState().setMealPlan([slot.date], [slot])
    useStore.getState().logPlannedMeal(slot.id, entries('Reis', 'Huhn'))
    const [reis, huhn] = useStore.getState().foods
    // Nutrition "eat again" spreads the old entry
    useStore.getState().addFood({ ...reis, date: '2026-11-03', grams: 80 })
    useStore.getState().addFoods([{ ...huhn, date: '2026-11-04' }])
    const again = useStore.getState().foods.filter((f) => f.date !== slot.date)
    expect(again.map((f) => [f.planSlot, f.booking])).toEqual([
      [undefined, undefined],
      [undefined, undefined],
    ])
    useStore.getState().logPlannedMeal(slot.id, entries('Nudeln'))
    expect(useStore.getState().foods.map((f) => f.name)).toEqual(['Reis', 'Huhn', 'Nudeln'])
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

/*
 * Backups are the whole persisted store as JSON (SettingsPage exportData). The fixtures follow
 * the store shapes in git history: the first release (5f9a617), + recipes, supplements and
 * measurements (3606278), + syncMeta (faba81c), + meal planner (7f2ccd0).
 */
describe('store: restoring a backup', () => {
  const settings = { restTimerSound: false, restTimerVibrate: true, warmupSets: true, excludedExercises: [], mode: 'normal' }
  const firstRelease = {
    version: 1,
    profile: { name: 'Alt', sex: 'm', age: 30, heightCm: 180, weightKg: 80, activity: 1.4, goal: 'muskelaufbau', level: 'anfaenger', location: 'gym', equipment: [], daysPerWeek: 3, sessionMinutes: 60, trainingDays: [0, 2, 4], createdAt: '2026-10-14' },
    pastMesos: [],
    sessions: [{ id: 's1', date: '2026-10-14', startedAt: '2026-10-14T10:00:00.000Z', finishedAt: '2026-10-14T11:00:00.000Z', mesoId: 'm1', exercises: [] }],
    checkIns: [{ date: '2026-10-14', energy: 3 }],
    foods: [{ id: 'f1', date: '2026-10-14', meal: 'mittag', name: 'Reis', grams: 200, per100 }],
    customFoods: [],
    customExercises: [],
    weights: [{ date: '2026-10-14', kg: 80 }],
    cardio: [],
    mobility: [],
    kcalAdjustment: 0,
    settings,
    frozenDays: [],
  }
  const withExtras = { ...firstRelease, recipes: [{ id: 'r9', name: 'Alt-Rezept', servings: 1, items: [] }], supplements: [], supplementLog: {}, measurements: [] }
  const withSync = { ...withExtras, syncMeta: { stamps: { 'i:foods:f1': 1 }, tombstones: {} } }
  const withPlanner = { ...withSync, mealPlan: [], shoppingChecked: [] }

  function current() {
    useStore.getState().reset()
    useStore.setState({
      mealPlan: [{ id: '2026-11-02|mittag|0', date: '2026-11-02', meal: 'mittag', dishId: 'd', factor: 1 }],
      recipes: [{ id: 'r1', name: 'Neu', servings: 1, items: [] }],
      syncMeta: { stamps: { 'i:recipes:r1': 50 }, tombstones: { 'foods:weg': 40 } },
    })
  }

  it.each([
    ['first release', firstRelease],
    ['with recipes, supplements and measurements', withExtras],
    ['with sync stamps', withSync],
    ['with the meal planner', withPlanner],
  ])('imports a historic backup (%s)', (_, backup) => {
    current()
    useStore.getState().importData(JSON.stringify(backup))
    const s = useStore.getState()
    expect(s.sessions.map((x) => x.id)).toEqual(['s1'])
    expect(s.foods.map((x) => x.id)).toEqual(['f1'])
    expect(s.profile?.name).toBe('Alt')
    expect(s.settings.restTimerSound).toBe(false)
    // keys an older backup does not know keep their current value
    expect(s.mealPlan).toHaveLength('mealPlan' in backup ? 0 : 1)
    expect(s.recipes.map((r) => r.id)).toEqual('recipes' in backup ? ['r9'] : ['r1'])
    // stamps and tombstones are never taken from a backup
    expect(s.syncMeta).toEqual({ stamps: { 'i:recipes:r1': 50 }, tombstones: { 'foods:weg': 40 } })
  })

  it('the account binding is neither written into a backup nor taken from one', () => {
    current()
    const owner = { origin: 'https://mci.example.test', id: 7, createdAt: 1 }
    useStore.setState({ owner, rev: 12 })
    expect(backupOf(useStore.getState())).not.toHaveProperty('owner')
    expect(backupOf(useStore.getState())).not.toHaveProperty('rev')
    useStore.getState().importData(JSON.stringify({ ...withPlanner, owner: { origin: 'x', id: 9, createdAt: 2 }, rev: 99 }))
    expect(useStore.getState().owner).toEqual(owner)
    expect(useStore.getState().rev).toBe(12)
  })

  it.each([
    ['a partial file', { sessions: [] }],
    ['a list', [firstRelease]],
    ['a collection that is no list', { ...firstRelease, foods: {} }],
    ['an item without its id', { ...firstRelease, sessions: [{ date: '2026-10-14' }] }],
    ['a date-keyed item without its date', { ...withPlanner, weights: [{ kg: 80 }] }],
    ['an item that is no object', { ...firstRelease, foods: ['Reis'] }],
    ['settings that are no object', { ...firstRelease, settings: 'x' }],
    ['a profile that is no object', { ...firstRelease, profile: [] }],
    ['the account export of the server', { exportedAt: '2026-11-01', account: {}, data: { v: 2, state: firstRelease } }],
  ])('rejects %s without touching the store', (_, bad) => {
    current()
    const before = JSON.stringify(useStore.getState())
    expect(() => useStore.getState().importData(JSON.stringify(bad))).toThrow()
    expect(() => useStore.getState().importData('{kaputt')).toThrow()
    expect(JSON.stringify(useStore.getState())).toBe(before)
  })
})
