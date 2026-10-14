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

/** Hard sets per muscle in the week starting `weekStart`: primary counts 1, secondary 0.5. */
export function weeklyMuscleSets(sessions: WorkoutSession[], lib: Map<string, Exercise>, weekStart = startOfWeek(today())): Record<Muscle, number> {
  const end = addDays(weekStart, 7)
  const out = {} as Record<Muscle, number>
  for (const s of sessions) {
    if (!s.finishedAt || s.date < weekStart || s.date >= end) continue
    for (const e of s.exercises) {
      const ex = lib.get(e.exerciseId)
      if (!ex) continue
      const n = workSets(e).length
      out[ex.primary] = (out[ex.primary] ?? 0) + n
      for (const m of ex.secondary) out[m] = (out[m] ?? 0) + n * 0.5
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
