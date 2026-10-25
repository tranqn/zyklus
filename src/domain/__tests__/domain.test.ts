import { describe, expect, it } from 'vitest'
import { EXERCISES, hasEquipment } from '../exercises'
import { FOODS } from '../foods'
import { parseMealText, suggestAdjustment, targets } from '../nutrition'
import { estimateMinutes, generateMesocycle, targetRir, weekSets } from '../planner'
import { applyTestResult, buildSession, cyclePosition, e1rm, nextTarget, pctFor } from '../progression'
import { muscleContributions, muscleRecovery, streak, weeklyMuscleSets } from '../stats'
import type { Profile, SessionExercise, WorkoutSession } from '../types'
import { addDays, today } from '../util'

const base: Profile = {
  name: 'Test',
  sex: 'm',
  age: 28,
  heightCm: 178,
  weightKg: 78,
  activity: 1.375,
  goal: 'muskelaufbau',
  level: 'fortgeschritten',
  location: 'studio',
  equipment: ['langhantel', 'kurzhantel', 'bank', 'kabel', 'maschine', 'klimmzugstange', 'dipbarren', 'baender', 'kettlebell', 'koerpergewicht'],
  daysPerWeek: 4,
  sessionMinutes: 60,
  trainingDays: [0, 1, 3, 4],
  createdAt: new Date().toISOString(),
}
const lib = new Map(EXERCISES.map((e) => [e.id, e]))

describe('exercise library', () => {
  it('has unique ids', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
  })
  it('offers a body-weight option for every main slot', () => {
    for (const slot of ['brust_compound', 'ruecken_horizontal', 'kniebeuge', 'hinge', 'unilateral_bein', 'bauch'] as const) {
      expect(EXERCISES.some((e) => e.slot === slot && hasEquipment(['koerpergewicht'], e))).toBe(true)
    }
  })
})

describe('planner', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    for (const minutes of [30, 45, 60, 90]) {
      it(`fits ${days} days × ${minutes} min`, () => {
        const meso = generateMesocycle({ ...base, daysPerWeek: days, sessionMinutes: minutes })
        expect(meso.days).toHaveLength(days)
        for (const d of meso.days) {
          expect(d.slots.length).toBeGreaterThanOrEqual(3)
          // first 3 slots are always kept; everything else must fit the budget
          if (d.slots.length > 3) expect(estimateMinutes(d)).toBeLessThanOrEqual(minutes + 1)
        }
      })
    }
  }
  it('builds a home plan with body weight only', () => {
    const meso = generateMesocycle({ ...base, location: 'zuhause', equipment: ['koerpergewicht'], level: 'anfaenger' })
    for (const d of meso.days) for (const s of d.slots) expect(hasEquipment(['koerpergewicht'], lib.get(s.exerciseId)!)).toBe(true)
  })
  it('respects excluded exercises', () => {
    const meso = generateMesocycle(base, { excluded: ['bankdruecken-lh'] })
    expect(meso.days.flatMap((d) => d.slots).some((s) => s.exerciseId === 'bankdruecken-lh')).toBe(false)
  })
  it('ramps RIR down and ends with a deload', () => {
    expect(targetRir(0, 5, 'fortgeschritten')).toBe(3)
    expect(targetRir(3, 5, 'fortgeschritten')).toBe(1)
    expect(targetRir(4, 5, 'fortgeschritten')).toBe(4)
    expect(weekSets(4, 4, 5, true)).toBe(2)
    expect(weekSets(3, 3, 5, true)).toBe(4)
  })
})

describe('progression', () => {
  const bench = lib.get('bankdruecken-lh')!
  const slot = { repMin: 6, repMax: 10 }
  const se = (sets: [number, number][]): SessionExercise => ({
    key: 'k',
    exerciseId: bench.id,
    slot: bench.slot,
    repMin: 6,
    repMax: 10,
    restSec: 150,
    sets: sets.map(([w, r]) => ({ kind: 'arbeit', weight: w, reps: r, targetReps: r, targetRir: 2, rir: 2, done: true })),
  })
  it('e1rm and pct are inverse', () => {
    const est = e1rm(100, 8, 2)
    expect(est * pctFor(8, 2)).toBeCloseTo(100)
  })
  it('requests a test set without history', () => {
    expect(nextTarget(bench, slot, undefined, 2, false).test).toBe(true)
  })
  it('adds weight once the top of the range is hit', () => {
    const t = nextTarget(bench, slot, se([[80, 10], [80, 10], [80, 10]]), 2, false)
    expect(t.weight).toBe(82.5)
    expect(t.reps).toBe(6)
  })
  it('adds a rep otherwise', () => {
    const t = nextTarget(bench, slot, se([[80, 8], [80, 7], [80, 7]]), 2, false)
    expect(t.weight).toBe(80)
    expect(t.reps).toBe(8)
  })
  it('lowers weight when clearly below range', () => {
    const t = nextTarget(bench, slot, se([[100, 3], [100, 3]]), 2, false)
    expect(t.weight!).toBeLessThan(100)
  })
  it('calibrates remaining sets from a test set', () => {
    const ex: SessionExercise = {
      ...se([]),
      sets: [
        { kind: 'test', weight: 60, reps: 10, rir: 2, targetReps: 10, targetRir: 2, done: true },
        { kind: 'arbeit', targetReps: 10, targetRir: 2, done: false },
      ],
    }
    const out = applyTestResult(ex, 2.5)
    expect(out.sets[1].targetWeight).toBe(60)
  })
  it('cuts sets for sore muscles', () => {
    const meso = generateMesocycle(base)
    const day = meso.days[0]
    const normal = buildSession({ meso, day, week: 0, level: base.level, library: lib, history: [], warmupSets: false })
    const sore = buildSession({
      meso,
      day,
      week: 0,
      level: base.level,
      library: lib,
      history: [],
      warmupSets: false,
      checkIn: { date: today(), sleep: 4, energy: 4, stress: 2, soreness: { brust: 3 } },
    })
    const count = (s: WorkoutSession) => s.exercises.filter((e) => lib.get(e.exerciseId)!.primary === 'brust').reduce((a, e) => a + e.sets.length, 0)
    expect(count(sore)).toBeLessThan(count(normal))
  })
  it('tracks cycle position', () => {
    const meso = generateMesocycle(base)
    const sessions = Array.from({ length: 5 }, (_, i) => ({ id: String(i), mesoId: meso.id, finishedAt: 'x' }) as WorkoutSession)
    expect(cyclePosition(meso, sessions)).toMatchObject({ week: 1, dayIndex: 1, finished: false })
  })
})

describe('nutrition', () => {
  it('creates a deficit for fat loss and a surplus for muscle gain', () => {
    const cut = targets({ ...base, goal: 'fettabbau' })
    const bulk = targets(base)
    expect(cut.kcal).toBeLessThan(bulk.kcal)
    expect(cut.protein).toBeGreaterThan(150)
  })
  it('parses free text meals', () => {
    const items = parseMealText('150g Hähnchenbrust, 2 Eier und 1 Banane', FOODS)
    expect(items.map((i) => i.food?.id)).toEqual(['haehnchenbrust', 'ei', 'banane'])
    expect(items[1].grams).toBe(120)
  })
  it('suggests more calories when gaining too slowly', () => {
    const weights = Array.from({ length: 21 }, (_, i) => ({ date: addDays(today(), i - 20), kg: 78 }))
    expect(suggestAdjustment(base, weights).delta).toBeGreaterThan(0)
  })
})

describe('streak', () => {
  it('counts consecutive days and survives frozen days', () => {
    const t = today()
    const src = { sessions: [], mobility: [{ date: t }, { date: addDays(t, -1) }, { date: addDays(t, -3) }], cardio: [], foods: [], weights: [], frozenDays: [addDays(t, -2)] }
    expect(streak(src)).toBe(3)
    expect(streak({ ...src, frozenDays: [] })).toBe(2)
  })
})

describe('muscle map', () => {
  const set = (reps: number) => ({ kind: 'arbeit', targetReps: reps, targetRir: 2, weight: 60, reps, done: true }) as SessionExercise['sets'][number]
  const exercise = (exerciseId: string, n: number) => ({ key: exerciseId, exerciseId, slot: 'brust_compound', repMin: 6, repMax: 10, restSec: 120, sets: Array.from({ length: n }, () => set(8)) }) as SessionExercise
  const session = (id: string, date: string, finishedAt: string, exercises: SessionExercise[]) =>
    ({ id, mesoId: 'm', planDayId: 'd', dayName: 'A', week: 1, deload: false, date, startedAt: finishedAt, finishedAt, exercises }) as WorkoutSession
  const week = '2026-10-19'
  const sessions = [
    session('a', '2026-10-20', '2026-10-20T18:00:00Z', [exercise('bankdruecken-lh', 4), exercise('klimmzuege', 3)]),
    session('b', '2026-10-22', '2026-10-22T18:00:00Z', [exercise('bankdruecken-kh', 2)]),
  ]

  it('counts secondary muscles half and lists contributing exercises', () => {
    const sets = weeklyMuscleSets(sessions, lib, week)
    expect(sets.brust).toBe(6)
    expect(sets.trizeps).toBe(3)
    expect(sets.bizeps).toBe(1.5)
    const tri = muscleContributions(sessions, lib, 'trizeps', week)
    expect(tri.map((c) => [c.exerciseId, c.sets, c.primary])).toEqual([
      ['bankdruecken-lh', 2, false],
      ['bankdruecken-kh', 1, false],
    ])
    expect(muscleContributions(sessions, lib, 'brust', '2026-10-26')).toEqual([])
  })

  it('estimates recovery from the last session that hit the muscle', () => {
    const now = new Date('2026-10-23T18:00:00Z').getTime()
    const r = muscleRecovery(sessions, lib, now)
    // chest: last hit by session b (2 sets -> 36 h needed), 24 h ago
    expect(r.brust?.last).toBe('2026-10-22T18:00:00Z')
    expect(r.brust?.ready).toBeCloseTo(24 / 36)
    expect(r.brust?.hoursLeft).toBe(12)
    // back: session a, 3 sets -> 42 h, 72 h ago -> recovered
    expect(r.ruecken?.ready).toBe(1)
    expect(r.ruecken?.hoursLeft).toBe(0)
    expect(r.waden).toBeUndefined()
    // sessions finishing after "now" are ignored
    expect(muscleRecovery(sessions, lib, new Date('2026-10-21T00:00:00Z').getTime()).brust?.sets).toBe(4)
  })
})
