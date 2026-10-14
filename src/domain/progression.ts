import { isDeload, targetRir, weekSets } from './planner'
import type {
  CheckIn,
  Exercise,
  Level,
  Mesocycle,
  Muscle,
  PlanDay,
  PlanSlot,
  SessionExercise,
  SetEntry,
  WorkoutSession,
} from './types'
import { clamp, today, uid } from './util'

/** Epley estimate; reps in reserve count as reps you could still have done. */
export function e1rm(weight: number, reps: number, rir = 0): number {
  const total = reps + rir
  if (total <= 1) return weight
  return weight * (1 + total / 30)
}

/** Fraction of 1RM you can move for `reps` with `rir` left (inverse Epley). */
export function pctFor(reps: number, rir: number): number {
  return 1 / (1 + (reps + rir) / 30)
}

export function roundLoad(kg: number, increment: number): number {
  const step = increment > 0 ? increment : 1
  return Math.max(0, Math.round(kg / step) * step)
}

export function workSets(se: SessionExercise): SetEntry[] {
  return se.sets.filter((s) => s.kind !== 'aufwaermen' && s.done && s.reps != null)
}

export function bestE1rm(se: SessionExercise): number | undefined {
  let best: number | undefined
  for (const s of workSets(se)) {
    if (!s.weight) continue
    const v = e1rm(s.weight, s.reps ?? 0, s.rir ?? s.targetRir)
    if (best == null || v > best) best = v
  }
  return best
}

export function volumeLoad(se: SessionExercise): number {
  return workSets(se).reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0)
}

export interface Target {
  weight?: number
  reps: number
  /** True when no history exists: the first set calibrates the load. */
  test: boolean
  reason: string
}

/**
 * Double progression on top of the last performance:
 * hit the top of the range on every set -> more weight, reps back to the bottom;
 * otherwise -> one more rep at the same weight; clearly below range -> recalc from e1RM.
 */
export function nextTarget(
  ex: Exercise,
  slot: Pick<PlanSlot, 'repMin' | 'repMax'>,
  last: SessionExercise | undefined,
  rir: number,
  deload: boolean,
): Target {
  const { repMin, repMax } = slot
  const done = last ? workSets(last) : []

  if (ex.loadType === 'koerpergewicht') {
    if (!done.length) return { reps: repMin + 2, test: false, reason: 'Starte locker und taste dich heran.' }
    const minReps = Math.min(...done.map((s) => s.reps ?? 0))
    if (deload) return { reps: Math.max(repMin, minReps - 2), test: false, reason: 'Deload: bewusst leichter.' }
    return { reps: Math.min(repMax + 5, minReps + 1), test: false, reason: 'Eine Wiederholung mehr als letztes Mal.' }
  }

  if (!done.length) {
    return { reps: repMax, test: true, reason: `Krafttest: wähle ein Gewicht für ca. ${repMax} Wdh. mit 2 Wdh. Reserve.` }
  }

  const weights = done.map((s) => s.weight ?? 0)
  const topWeight = Math.max(...weights)
  const atTop = done.filter((s) => (s.weight ?? 0) === topWeight)
  const minReps = Math.min(...atTop.map((s) => s.reps ?? 0))
  const est = bestE1rm(last!) ?? e1rm(topWeight, minReps)

  if (deload) {
    return { weight: roundLoad(topWeight * 0.85, ex.increment), reps: repMin, test: false, reason: 'Deload: 85 % Last, halbe Sätze.' }
  }
  if (minReps >= repMax) {
    return {
      weight: roundLoad(topWeight + ex.increment, ex.increment) || topWeight + ex.increment,
      reps: repMin,
      test: false,
      reason: `Alle Sätze bei ${repMax} Wdh. geschafft: mehr Gewicht.`,
    }
  }
  if (minReps < repMin - 1) {
    const w = roundLoad(est * pctFor(repMin, rir), ex.increment)
    return { weight: Math.min(w, topWeight), reps: repMin, test: false, reason: 'Letztes Mal unter dem Zielbereich: Gewicht angepasst.' }
  }
  return { weight: topWeight, reps: clamp(minReps + 1, repMin, repMax), test: false, reason: 'Gleiches Gewicht, eine Wiederholung mehr.' }
}

export function readinessScore(c: CheckIn, muscles: Muscle[]): number {
  const base = ((c.sleep - 1) / 4) * 40 + ((c.energy - 1) / 4) * 35 + ((5 - c.stress) / 4) * 25
  const sore = muscles.map((m) => c.soreness[m] ?? 0)
  const penalty = sore.length ? (Math.max(...sore) * 8 + (sore.reduce((a, b) => a + b, 0) / sore.length) * 4) : 0
  return Math.round(clamp(base - penalty, 0, 100))
}

export function lastPerformance(history: WorkoutSession[], exerciseId: string, beforeId?: string): SessionExercise | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i]
    if (!h.finishedAt || h.id === beforeId) continue
    const se = h.exercises.find((e) => e.exerciseId === exerciseId && workSets(e).length)
    if (se) return se
  }
  return undefined
}

export function warmups(weight: number, increment: number): SetEntry[] {
  if (weight < 30) return []
  const steps: [number, number][] = weight >= 80 ? [[0.5, 8], [0.7, 4], [0.85, 2]] : [[0.5, 8], [0.75, 3]]
  return steps.map(([pct, reps]) => ({
    kind: 'aufwaermen',
    targetWeight: roundLoad(weight * pct, increment || 2.5),
    targetReps: reps,
    targetRir: 5,
    done: false,
  }))
}

export interface BuildArgs {
  meso: Mesocycle
  day: PlanDay
  week: number
  level: Level
  library: Map<string, Exercise>
  history: WorkoutSession[]
  checkIn?: CheckIn
  warmupSets: boolean
  /** Coming back from illness or a long break. */
  reentry?: boolean
}

export function buildSession(a: BuildArgs): WorkoutSession {
  const deload = isDeload(a.week, a.meso.weeks)
  const baseRir = targetRir(a.week, a.meso.weeks, a.level)
  const globalTired = a.checkIn && (a.checkIn.sleep <= 2 || a.checkIn.energy <= 2)
  let firstCompoundDone = false

  const muscles = new Set<Muscle>()
  const exercises: SessionExercise[] = a.day.slots.flatMap((slot) => {
    const ex = a.library.get(slot.exerciseId)
    if (!ex) return []
    muscles.add(ex.primary)
    const sore = a.checkIn?.soreness[ex.primary] ?? 0
    let rir = baseRir + (globalTired ? 1 : 0) + (sore >= 2 ? 1 : 0) + (a.reentry ? 2 : 0)
    rir = Math.min(rir, 5)
    let sets = weekSets(slot.sets, a.week, a.meso.weeks, ex.compound)
    if (sore >= 2 && !deload) sets = Math.max(1, sets - 1)
    if (a.reentry) sets = Math.max(1, sets - 1)

    const last = lastPerformance(a.history, ex.id)
    const t = nextTarget(ex, slot, last, rir, deload)
    let weight = t.weight
    // sore or returning: hold the load instead of progressing
    if (weight != null && last && (sore >= 3 || a.reentry)) {
      const prevTop = Math.max(...workSets(last).map((s) => s.weight ?? 0))
      weight = Math.min(weight, roundLoad(prevTop * (a.reentry ? 0.9 : 1), ex.increment))
    }

    const entries: SetEntry[] = []
    if (a.warmupSets && ex.compound && !firstCompoundDone && weight != null && !deload) {
      entries.push(...warmups(weight, ex.increment))
      firstCompoundDone = true
    }
    for (let i = 0; i < sets; i++) {
      entries.push({
        kind: t.test && i === 0 ? 'test' : 'arbeit',
        targetWeight: weight,
        targetReps: t.reps,
        // the calibration set is always taken to about 2 reps in reserve
        targetRir: t.test && i === 0 ? 2 : rir,
        done: false,
      })
    }
    return [
      {
        key: slot.key,
        exerciseId: ex.id,
        slot: slot.slot,
        repMin: slot.repMin,
        repMax: slot.repMax,
        restSec: slot.restSec,
        superset: slot.superset,
        note: t.reason,
        sets: entries,
      },
    ]
  })

  const now = new Date().toISOString()
  return {
    id: uid(),
    mesoId: a.meso.id,
    planDayId: a.day.id,
    dayName: a.day.name,
    week: a.week,
    deload,
    date: today(),
    startedAt: now,
    checkIn: a.checkIn,
    readiness: a.checkIn ? readinessScore(a.checkIn, [...muscles]) : undefined,
    exercises,
  }
}

/** After a test set is logged, derive the load for the remaining sets of that exercise. */
export function applyTestResult(se: SessionExercise, increment: number): SessionExercise {
  const test = se.sets.find((s) => s.kind === 'test' && s.done && s.weight && s.reps)
  if (!test) return se
  const est = e1rm(test.weight!, test.reps!, test.rir ?? 2)
  return {
    ...se,
    sets: se.sets.map((s) =>
      s.kind === 'arbeit' && !s.done
        ? { ...s, targetWeight: roundLoad(est * pctFor(s.targetReps, s.targetRir), increment), targetReps: s.targetReps }
        : s,
    ),
  }
}

/** Where the athlete is in the current cycle, derived from finished sessions. */
export function cyclePosition(meso: Mesocycle, history: WorkoutSession[]): { done: number; week: number; dayIndex: number; finished: boolean } {
  const done = history.filter((h) => h.mesoId === meso.id && h.finishedAt).length
  const perWeek = meso.days.length
  const week = Math.floor(done / perWeek)
  return { done, week: Math.min(week, meso.weeks - 1), dayIndex: done % perWeek, finished: done >= perWeek * meso.weeks }
}
