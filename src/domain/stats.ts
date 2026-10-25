import { bestE1rm, workSets } from './progression'
import type { Exercise, Muscle, WorkoutSession } from './types'
import { addDays, startOfWeek, today } from './util'

export interface ActivitySources {
  sessions: WorkoutSession[]
  mobility: { date: string }[]
  cardio: { date: string }[]
  foods: { date: string }[]
  weights: { date: string }[]
  frozenDays: string[]
  measurements?: { date: string }[]
  supplementLog?: Record<string, string[]>
}

export function activityDays(s: ActivitySources): Set<string> {
  const days = new Set<string>()
  s.sessions.forEach((x) => x.finishedAt && days.add(x.date))
  s.mobility.forEach((x) => days.add(x.date))
  s.cardio.forEach((x) => days.add(x.date))
  s.foods.forEach((x) => days.add(x.date))
  s.weights.forEach((x) => days.add(x.date))
  s.measurements?.forEach((x) => days.add(x.date))
  Object.entries(s.supplementLog ?? {}).forEach(([d, ids]) => ids.length && days.add(d))
  return days
}

/** Consecutive active days up to today; today may still be open. Frozen days (vacation, sick) neither break nor count. */
export function streak(s: ActivitySources): number {
  const active = activityDays(s)
  const frozen = new Set(s.frozenDays)
  let d = today()
  if (!active.has(d)) d = addDays(d, -1)
  let n = 0
  for (let guard = 0; guard < 3650; guard++) {
    if (active.has(d)) n++
    else if (!frozen.has(d)) break
    d = addDays(d, -1)
  }
  return n
}

/** Weighted hard sets an exercise gives each muscle: primary counts 1, secondary 0.5. */
function muscleShare(ex: Exercise, sets: number): [Muscle, number][] {
  return [[ex.primary, sets], ...ex.secondary.map((m): [Muscle, number] => [m, sets * 0.5])]
}

function sessionMuscleSets(s: WorkoutSession, lib: Map<string, Exercise>): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {}
  for (const e of s.exercises) {
    const ex = lib.get(e.exerciseId)
    const n = workSets(e).length
    if (!ex || !n) continue
    for (const [m, v] of muscleShare(ex, n)) out[m] = (out[m] ?? 0) + v
  }
  return out
}

/** Hard sets per muscle in the week starting `weekStart`: primary counts 1, secondary 0.5. */
export function weeklyMuscleSets(sessions: WorkoutSession[], lib: Map<string, Exercise>, weekStart = startOfWeek(today())): Record<Muscle, number> {
  const end = addDays(weekStart, 7)
  const out = {} as Record<Muscle, number>
  for (const s of sessions) {
    if (!s.finishedAt || s.date < weekStart || s.date >= end) continue
    for (const [m, v] of Object.entries(sessionMuscleSets(s, lib)) as [Muscle, number][]) out[m] = (out[m] ?? 0) + v
  }
  return out
}

export interface MuscleContribution {
  exerciseId: string
  sets: number
  primary: boolean
}

/** Which exercises fed a muscle in the week starting `weekStart`, largest share first. */
export function muscleContributions(sessions: WorkoutSession[], lib: Map<string, Exercise>, muscle: Muscle, weekStart = startOfWeek(today())): MuscleContribution[] {
  const end = addDays(weekStart, 7)
  const by = new Map<string, MuscleContribution>()
  for (const s of sessions) {
    if (!s.finishedAt || s.date < weekStart || s.date >= end) continue
    for (const e of s.exercises) {
      const ex = lib.get(e.exerciseId)
      const n = workSets(e).length
      if (!ex || !n) continue
      const share = muscleShare(ex, n).find(([m]) => m === muscle)
      if (!share) continue
      const cur = by.get(ex.id) ?? { exerciseId: ex.id, sets: 0, primary: ex.primary === muscle }
      cur.sets += share[1]
      by.set(ex.id, cur)
    }
  }
  return [...by.values()].sort((a, b) => b.sets - a.sets)
}

export interface MuscleRecovery {
  /** finishedAt of the last session that trained the muscle */
  last: string
  /** weighted sets in that session */
  sets: number
  /** 0..1, 1 = recovered */
  ready: number
  hoursLeft: number
}

/**
 * Rough recovery guide per muscle from the last session that trained it: about 24 h plus 6 h per weighted set,
 * capped at 96 h (2 sets ≈ 36 h, 4 ≈ 48 h, 8 ≈ 72 h). A rule of thumb, not a measurement.
 */
export function muscleRecovery(sessions: WorkoutSession[], lib: Map<string, Exercise>, now = Date.now()): Partial<Record<Muscle, MuscleRecovery>> {
  const out: Partial<Record<Muscle, MuscleRecovery>> = {}
  const done = sessions.filter((s) => s.finishedAt && new Date(s.finishedAt).getTime() <= now).sort((a, b) => (a.finishedAt! < b.finishedAt! ? 1 : -1))
  for (const s of done) {
    for (const [m, sets] of Object.entries(sessionMuscleSets(s, lib)) as [Muscle, number][]) {
      if (out[m]) continue
      const need = Math.min(96, 24 + 6 * sets)
      const hours = (now - new Date(s.finishedAt!).getTime()) / 3_600_000
      out[m] = { last: s.finishedAt!, sets, ready: Math.min(1, hours / need), hoursLeft: Math.max(0, Math.ceil(need - hours)) }
    }
  }
  return out
}

export interface PR {
  exerciseId: string
  e1rm: number
  weight: number
  reps: number
  date: string
}

export function personalRecords(sessions: WorkoutSession[]): PR[] {
  const best = new Map<string, PR>()
  for (const s of sessions) {
    if (!s.finishedAt) continue
    for (const e of s.exercises) {
      const v = bestE1rm(e)
      if (!v) continue
      const top = workSets(e).reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a))
      const cur = best.get(e.exerciseId)
      if (!cur || v > cur.e1rm) best.set(e.exerciseId, { exerciseId: e.exerciseId, e1rm: v, weight: top.weight ?? 0, reps: top.reps ?? 0, date: s.date })
    }
  }
  return [...best.values()].sort((a, b) => b.e1rm - a.e1rm)
}

export function sessionVolume(s: WorkoutSession): number {
  return s.exercises.reduce((a, e) => a + workSets(e).reduce((b, x) => b + (x.weight ?? 0) * (x.reps ?? 0), 0), 0)
}

export function sessionSets(s: WorkoutSession): number {
  return s.exercises.reduce((a, e) => a + workSets(e).length, 0)
}

export function sessionMinutes(s: WorkoutSession): number | undefined {
  if (!s.finishedAt) return undefined
  return Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
}

/** New PRs set in this session compared with everything before it. */
export function prsInSession(all: WorkoutSession[], session: WorkoutSession): string[] {
  const before = personalRecords(all.filter((s) => s.id !== session.id && s.date <= session.date && s.startedAt < session.startedAt))
  const prev = new Map(before.map((p) => [p.exerciseId, p.e1rm]))
  return session.exercises.filter((e) => {
    const v = bestE1rm(e)
    const p = prev.get(e.exerciseId)
    return v != null && p != null && v > p + 0.01
  }).map((e) => e.exerciseId)
}

/** Weekly set landmarks (rough evidence-based ranges per muscle). */
export const VOLUME_RANGE: [number, number] = [10, 20]
