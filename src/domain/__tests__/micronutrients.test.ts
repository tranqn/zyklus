import { describe, expect, it } from 'vitest'
import { DISHES, dishMicros } from '../meals'
import { MICROS_PER_100G } from '../micronutrient-data'
import { addMicros, microTargets, scaleMicros, type Micros } from '../micronutrients'
import { microTotals } from '../nutrition'
import { toFood } from '../openfoodfacts'

const per100 = (id: string): Micros | undefined => MICROS_PER_100G[id]

describe('micronutrients', () => {
  it('keeps a missing value missing instead of counting it as zero', () => {
    // iodine is in no USDA entry we use, so it must not appear at all
    expect(MICROS_PER_100G.spinat.iron).toBeCloseTo(2.71, 2)
    expect('iodine' in MICROS_PER_100G.spinat).toBe(false)

    const scaled = scaleMicros(MICROS_PER_100G.spinat, 50)!
    expect(scaled.iron).toBeCloseTo(1.355, 3)
    expect('iodine' in scaled).toBe(false)

    const total: Micros = {}
    addMicros(total, scaled)
    addMicros(total, scaleMicros(MICROS_PER_100G.ei, 60))
    expect('iodine' in total).toBe(false)
    // spinach has no B12, the egg has: the sum must be the egg's alone, not zero
    expect(total.vitaminB12).toBeCloseTo((0.89 * 60) / 100, 3)
  })

  it('reports how much of a day actually has data', () => {
    const day = [
      { grams: 100, foodId: 'spinat' },
      { grams: 60, foodId: 'ei' },
      { grams: 200, foodId: 'pho-bo' }, // a Vietnamese prepared dish: no entry
      { grams: 150, foodId: undefined }, // typed as free text
    ]
    const r = microTotals(day, per100)
    expect(r.entries).toBe(4)
    expect(r.withData).toBe(2)
    expect(r.totals.calcium).toBeCloseTo(99 + (56 * 60) / 100, 1)
  })

  it('sums a dish from its ingredients and says how many were covered', () => {
    const bibimbap = DISHES.find((d) => d.id === 'bibimbap')!
    const r = dishMicros(bibimbap, per100)
    expect(r.items).toBeGreaterThan(5)
    expect(r.covered).toBeGreaterThan(0)
    expect(r.covered).toBeLessThan(r.items) // not every ingredient is mapped yet
    expect(r.micros.iron!).toBeGreaterThan(0)
  })

  it('takes the reference values from age and sex', () => {
    expect(microTargets({ sex: 'm', age: 30 }).iron).toBe(11)
    expect(microTargets({ sex: 'w', age: 30 }).iron).toBe(16)
    // the DGE splits iron at the menopause; the app only knows the age it uses as the line
    expect(microTargets({ sex: 'w', age: 55 }).iron).toBe(14)
    expect(microTargets({ sex: 'm', age: 30 }).vitaminC).toBe(110)
    expect(microTargets({ sex: 'w', age: 30 }).vitaminC).toBe(95)
    expect(microTargets(null).calcium).toBe(1000)
  })

  describe('Open Food Facts', () => {
    const product = (nutriments: Record<string, number | string>) =>
      toFood({ code: '1', product_name: 'Test', nutriments: { 'energy-kcal_100g': 100, ...nutriments } })

    it('takes a value whose unit is stated', () => {
      expect(product({ iron_100g: 2.5, iron_unit: 'mg' })?.micros?.iron).toBeCloseTo(2.5, 3)
      expect(product({ iron_100g: 0.0025, iron_unit: 'g' })?.micros?.iron).toBeCloseTo(2.5, 3)
      expect(product({ 'vitamin-b12_100g': 2.4, 'vitamin-b12_unit': 'µg' })?.micros?.vitaminB12).toBeCloseTo(2.4, 3)
    })

    it('refuses a value without a unit, instead of guessing by a factor of 1000', () => {
      expect(product({ iron_100g: 2.5 })?.micros).toBeUndefined()
    })

    it('refuses a value that cannot be true for 100 g', () => {
      expect(product({ iron_100g: 5000, iron_unit: 'mg' })?.micros).toBeUndefined()
    })

    it('leaves a product without any micronutrient data without the field', () => {
      expect(product({ proteins_100g: 5 })?.micros).toBeUndefined()
    })
  })
})
