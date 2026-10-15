/**
 * Translated names for stored domain objects. Older data (and data synced from devices on an
 * older version) only has German text, so keys are inferred from the known German names.
 */
import type { Mesocycle, PlanDay, SessionExercise, WorkoutSession } from '../domain/types'
import { tk } from './index'
import { program } from './ns/program'

const DAY_BY_NAME = new Map(Object.entries(program.de.day).map(([k, v]) => [v.name, k]))
const SPLIT_BY_NAME = new Map(Object.entries(program.de.split).map(([k, v]) => [v, k]))
const NOTE_BY_TEXT = new Map(Object.entries(program.de.note).filter(([, v]) => !v.includes('{')).map(([k, v]) => [v, k]))

export function dayKeyOf(d: Pick<PlanDay, 'key' | 'name'>): string | undefined {
  return d.key ?? DAY_BY_NAME.get(d.name)
}

export function dayName(d: Pick<PlanDay, 'key' | 'name'>): string {
  const k = dayKeyOf(d)
  return k ? tk(`program.day.${k}.name`, undefined, d.name) : d.name
}

export function dayFocus(d: Pick<PlanDay, 'key' | 'name' | 'focus'>): string {
  const k = dayKeyOf(d)
  return k ? tk(`program.day.${k}.focus`, undefined, d.focus) : d.focus
}

export function sessionDayName(s: Pick<WorkoutSession, 'dayKey' | 'dayName'>): string {
  return dayName({ key: s.dayKey, name: s.dayName })
}

export function splitName(m: Pick<Mesocycle, 'splitKey' | 'split'>): string {
  const k = m.splitKey ?? SPLIT_BY_NAME.get(m.split)
  return k ? tk(`program.split.${k}`, undefined, m.split) : m.split
}

export function noteText(se: Pick<SessionExercise, 'noteKey' | 'noteParams' | 'note'>): string | undefined {
  const k = se.noteKey ?? (se.note ? NOTE_BY_TEXT.get(se.note) : undefined)
  if (k) return tk(`program.note.${k}`, se.noteParams, se.note)
  return se.note
}
