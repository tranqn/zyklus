import type { Profile } from './types'

/**
 * Micronutrients: eleven values per 100 g, and the reference intake they are compared against.
 *
 * The point of this module is the difference between "no data" and "zero". A value that is
 * missing is `undefined` and must never be rendered or summed as 0: someone who watches a
 * deficiency would read a gap as a deficit. USDA has no iodine for most foods and no vitamin D
 * outside fish, mushrooms and fortified products, so gaps are the normal case, not the exception.
 */

export const MICRO_IDS = [
  'iron',
  'calcium',
  'magnesium',
  'zinc',
  'potassium',
  'sodium',
  'iodine',
  'vitaminD',
  'vitaminB12',
  'folate',
  'vitaminC',
] as const
export type MicroId = (typeof MICRO_IDS)[number]

/** Unknown stays unknown: a key that is absent means "not in the source", never "none in it". */
export type Micros = Partial<Record<MicroId, number>>

export const MICRO_UNIT: Record<MicroId, 'mg' | 'µg'> = {
  iron: 'mg',
  calcium: 'mg',
  magnesium: 'mg',
  zinc: 'mg',
  potassium: 'mg',
  sodium: 'mg',
  iodine: 'µg',
  vitaminD: 'µg',
  vitaminB12: 'µg',
  folate: 'µg',
  vitaminC: 'mg',
}

/*
 * Reference values: DGE/ÖGE, read off the per-nutrient tables on dge.de on 2026-11-11.
 * Adults, per day. Where the sexes differ, the table gives both.
 *
 *   iron        m 11 | w 16 before the menopause, 14 after      (Ausgabe 2024)
 *   calcium     1000 both
 *   magnesium   m 350 | w 300
 *   zinc        depends on phytate intake; the middle column of the table (mittlere
 *               Phytatzufuhr) is the sensible default for a mixed diet: m 14 | w 8
 *   potassium   4000 both                                        (2. Ausgabe 2016)
 *   sodium      1500 both, an estimate of an adequate intake     (2. Ausgabe 2016)
 *   iodine      150 both                                         (3. Auflage 2025)
 *   vitamin D   20, for the case of no endogenous synthesis
 *   vitamin B12 4.0 both
 *   folate      300 µg equivalents
 *   vitamin C   m 110 | w 95
 *
 * The menopause is not something the app asks about, so the age the DGE itself uses as the
 * dividing line (51) stands in for it. That is an approximation, and the UI says so.
 */
const REFERENCE: Record<MicroId, { m: number; w: number; wOver50?: number }> = {
  iron: { m: 11, w: 16, wOver50: 14 },
  calcium: { m: 1000, w: 1000 },
  magnesium: { m: 350, w: 300 },
  zinc: { m: 14, w: 8 },
  potassium: { m: 4000, w: 4000 },
  sodium: { m: 1500, w: 1500 },
  iodine: { m: 150, w: 150 },
  vitaminD: { m: 20, w: 20 },
  vitaminB12: { m: 4, w: 4 },
  folate: { m: 300, w: 300 },
  vitaminC: { m: 110, w: 95 },
}

/** Daily reference intake for this person. */
export function microTargets(p: Pick<Profile, 'sex' | 'age'> | null | undefined): Record<MicroId, number> {
  const female = p?.sex === 'w'
  const over50 = (p?.age ?? 30) >= 51
  const out = {} as Record<MicroId, number>
  for (const id of MICRO_IDS) {
    const r = REFERENCE[id]
    out[id] = female ? (over50 ? (r.wOver50 ?? r.w) : r.w) : r.m
  }
  return out
}

/** Sodium is the one value where staying low is the goal, so its bar reads the other way round. */
export const MICRO_UPPER: Partial<Record<MicroId, number>> = {
  // DGE: 1500 mg sodium is the adequate intake, 6 g salt a day the upper orientation (2.4 g sodium)
  sodium: 2400,
}

/** Adds `add` (already scaled to the eaten amount) onto `into`, keeping unknown unknown. */
export function addMicros(into: Micros, add: Micros | undefined): Micros {
  if (!add) return into
  for (const id of MICRO_IDS) {
    const v = add[id]
    if (v === undefined) continue
    into[id] = (into[id] ?? 0) + v
  }
  return into
}

/** Scales a per-100 g profile to `grams`. */
export function scaleMicros(per100: Micros | undefined, grams: number): Micros | undefined {
  if (!per100) return undefined
  const out: Micros = {}
  for (const id of MICRO_IDS) {
    const v = per100[id]
    if (v !== undefined) out[id] = (v * grams) / 100
  }
  return out
}
