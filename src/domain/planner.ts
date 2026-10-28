import { EXERCISES, hasEquipment, levelAllows } from './exercises'
import { generateWinterArc } from './presets'
import type { Exercise, Goal, Level, Mesocycle, PlanDay, PlanSlot, Profile, Slot } from './types'
import { uid } from './util'

type Prio = 1 | 2 | 3

interface TemplateSlot {
  slot: Slot
  prio: Prio
  /** Picks the n-th fitting exercise, so A and B days differ. */
  variant?: number
}

interface DayTemplate {
  key: string
  name: string
  focus: string
  slots: TemplateSlot[]
}

const s = (slot: Slot, prio: Prio, variant = 0): TemplateSlot => ({ slot, prio, variant })

const GK_A: DayTemplate = {
  key: 'gk_a',
  name: 'Ganzkörper A',
  focus: 'Kniebeuge, Drücken, Rudern',
  slots: [s('kniebeuge', 1), s('brust_compound', 1), s('ruecken_horizontal', 1), s('hinge', 2), s('seitheben', 2), s('bizeps', 3), s('trizeps', 3), s('waden', 3), s('bauch', 3)],
}
const GK_B: DayTemplate = {
  key: 'gk_b',
  name: 'Ganzkörper B',
  focus: 'Hüfte, Schrägbank, Latzug',
  slots: [s('hinge', 1, 1), s('ruecken_vertikal', 1), s('brust_schraeg', 1), s('unilateral_bein', 2), s('schulter_press', 2), s('beinbeuger_iso', 3), s('hintere_schulter', 3), s('trizeps', 3, 1), s('bauch', 3, 1)],
}
const GK_C: DayTemplate = {
  key: 'gk_c',
  name: 'Ganzkörper C',
  focus: 'Beine, Schultern, Arme',
  slots: [s('kniebeuge', 1, 1), s('schulter_press', 1), s('ruecken_horizontal', 1, 1), s('brust_iso', 2), s('quad_iso', 2), s('beinbeuger_iso', 3, 1), s('bizeps', 3, 1), s('gesaess_iso', 3), s('waden', 3, 1)],
}
const OK_A: DayTemplate = {
  key: 'ok_a',
  name: 'Oberkörper A',
  focus: 'Brust und Rücken schwer',
  slots: [s('brust_compound', 1), s('ruecken_horizontal', 1), s('schulter_press', 2), s('ruecken_vertikal', 2), s('seitheben', 2), s('bizeps', 3), s('trizeps', 3), s('unterarme', 3)],
}
const OK_B: DayTemplate = {
  key: 'ok_b',
  name: 'Oberkörper B',
  focus: 'Obere Brust, Latzug, Schultern',
  slots: [s('ruecken_vertikal', 1, 1), s('brust_schraeg', 1), s('ruecken_horizontal', 2, 1), s('brust_iso', 2), s('hintere_schulter', 2), s('seitheben', 3, 1), s('trizeps', 3, 1), s('bizeps', 3, 1)],
}
const UK_A: DayTemplate = {
  key: 'uk_a',
  name: 'Unterkörper A',
  focus: 'Kniebeuge-Fokus',
  slots: [s('kniebeuge', 1), s('hinge', 1), s('quad_iso', 2), s('beinbeuger_iso', 2), s('waden', 3), s('bauch', 3)],
}
const UK_B: DayTemplate = {
  key: 'uk_b',
  name: 'Unterkörper B',
  focus: 'Hüft-Fokus',
  slots: [s('hinge', 1, 1), s('unilateral_bein', 1), s('beinbeuger_iso', 2, 1), s('kniebeuge', 2, 1), s('gesaess_iso', 3), s('waden', 3, 1), s('bauch', 3, 1)],
}
const PUSH = (v: number): DayTemplate => ({
  key: v ? 'push_b' : 'push_a',
  name: `Push ${v ? 'B' : 'A'}`,
  focus: 'Brust, Schultern, Trizeps',
  slots: [s(v ? 'brust_schraeg' : 'brust_compound', 1), s('schulter_press', 1, v), s(v ? 'brust_compound' : 'brust_schraeg', 2, v), s('seitheben', 2, v), s('brust_iso', 3, v), s('trizeps', 2, v), s('trizeps', 3, v + 1)],
})
const PULL = (v: number): DayTemplate => ({
  key: v ? 'pull_b' : 'pull_a',
  name: `Pull ${v ? 'B' : 'A'}`,
  focus: 'Rücken, hintere Schulter, Bizeps',
  slots: [s('ruecken_vertikal', 1, v), s('ruecken_horizontal', 1, v), s('ruecken_horizontal', 2, v + 1), s('hintere_schulter', 2, v), s('bizeps', 2, v), s('bizeps', 3, v + 1), s('unterarme', 3, v)],
})
const LEGS = (v: number): DayTemplate => ({
  key: v ? 'legs_b' : 'legs_a',
  name: `Beine ${v ? 'B' : 'A'}`,
  focus: 'Quadrizeps, Beinbeuger, Gesäß',
  slots: [s(v ? 'hinge' : 'kniebeuge', 1, v), s(v ? 'kniebeuge' : 'hinge', 1, v), s('unilateral_bein', 2, v), s('quad_iso', 2, v), s('beinbeuger_iso', 2, v), s('waden', 3, v), s('bauch', 3, v)],
})

export function splitFor(days: number): { key: string; name: string; templates: DayTemplate[] } {
  switch (days) {
    case 2:
      return { key: 's2', name: 'Ganzkörper (2x)', templates: [GK_A, GK_B] }
    case 3:
      return { key: 's3', name: 'Ganzkörper (3x)', templates: [GK_A, GK_B, GK_C] }
    case 4:
      return { key: 's4', name: 'Oberkörper / Unterkörper', templates: [OK_A, UK_A, OK_B, UK_B] }
    case 5:
      return { key: 's5', name: 'OK/UK + Push/Pull/Beine', templates: [OK_A, UK_A, PUSH(0), PULL(0), LEGS(1)] }
    default:
      return { key: 's6', name: 'Push / Pull / Beine (2x)', templates: [PUSH(0), PULL(0), LEGS(0), PUSH(1), PULL(1), LEGS(1)] }
  }
}

export function repRange(goal: Goal, ex: Exercise): [number, number] {
  if (ex.slot === 'unterarme') return [4, 8]
  if (ex.loadType === 'koerpergewicht') return ex.compound ? [6, 15] : [10, 20]
  if (goal === 'kraft') return ex.compound ? [4, 6] : [8, 12]
  if (goal === 'muskelaufbau') return ex.compound ? [6, 10] : [10, 15]
  return ex.compound ? [8, 12] : [12, 15]
}

export function restFor(goal: Goal, ex: Exercise): number {
  if (ex.compound) return goal === 'kraft' ? 180 : goal === 'fettabbau' ? 120 : 150
  return goal === 'fettabbau' ? 60 : 90
}

export function mesoWeeks(level: Level): number {
  return level === 'profi' ? 6 : 5
}

const SUPERSET_PAIRS: [Slot, Slot][] = [
  ['bizeps', 'trizeps'],
  ['seitheben', 'hintere_schulter'],
  ['quad_iso', 'beinbeuger_iso'],
  ['waden', 'bauch'],
  ['brust_iso', 'gesaess_iso'],
]

const SET_SECONDS = 45
const WARMUP_SECONDS = 6 * 60

function candidates(slot: Slot, profile: Profile, library: Exercise[], excluded: string[]): Exercise[] {
  return library.filter(
    (e) => e.slot === slot && !excluded.includes(e.id) && hasEquipment(profile.equipment, e) && levelAllows(profile.level, e.minLevel),
  )
}

/** Fallback when the strict level filter leaves nothing (e.g. home user without pull-up bar). */
function candidatesLoose(slot: Slot, profile: Profile, library: Exercise[], excluded: string[]): Exercise[] {
  const strict = candidates(slot, profile, library, excluded)
  if (strict.length) return strict
  return library.filter((e) => e.slot === slot && !excluded.includes(e.id) && hasEquipment(profile.equipment, e))
}

function baseSets(prio: Prio, level: Level): number {
  if (prio === 3) return 2
  if (level === 'anfaenger') return prio === 1 ? 3 : 2
  return 3
}

function slotSeconds(slots: PlanSlot[], pairing: boolean): number {
  let total = WARMUP_SECONDS
  const seen = new Set<string>()
  for (const sl of slots) {
    if (seen.has(sl.key)) continue
    const partner = pairing && sl.superset ? slots.find((o) => o !== sl && o.superset === sl.superset) : undefined
    if (partner) {
      seen.add(partner.key)
      total += Math.max(sl.sets, partner.sets) * (2 * SET_SECONDS + Math.max(sl.restSec, partner.restSec))
    } else {
      total += sl.sets * (SET_SECONDS + sl.restSec)
    }
    seen.add(sl.key)
  }
  return total
}

function assignSupersets(slots: PlanSlot[]): void {
  let letter = 0
  for (const sl of slots) delete sl.superset
  for (const [a, b] of SUPERSET_PAIRS) {
    const x = slots.find((sl) => sl.slot === a && !sl.superset)
    const y = slots.find((sl) => sl.slot === b && !sl.superset)
    if (x && y) {
      const tag = String.fromCharCode(65 + letter++)
      x.superset = tag
      y.superset = tag
      // keep pair adjacent
      slots.splice(slots.indexOf(y), 1)
      slots.splice(slots.indexOf(x) + 1, 0, y)
    }
  }
}

export interface GenerateOptions {
  mesoNumber?: number
  library?: Exercise[]
  excluded?: string[]
  /** Extra sets for prio-1 slots after a well-recovered cycle (0 to 2). */
  volumeBonus?: number
  /** Keep the exercise choices of a previous cycle where possible. */
  previous?: Mesocycle
}

export function generateMesocycle(profile: Profile, opts: GenerateOptions = {}): Mesocycle {
  if (profile.program === 'winter_arc') return generateWinterArc(profile, opts)
  const mesoNumber = opts.mesoNumber ?? 1
  const library = opts.library ?? EXERCISES
  const excluded = opts.excluded ?? []
  const bonus = opts.volumeBonus ?? 0
  const split = splitFor(profile.daysPerWeek)
  const pairing = profile.sessionMinutes <= 60
  const budget = profile.sessionMinutes * 60
  const usedInMeso = new Set<string>()

  const days: PlanDay[] = split.templates.map((tpl, dayIdx) => {
    const ordered = [...tpl.slots].sort((a, b) => a.prio - b.prio)
    const chosen: (PlanSlot & { prio: Prio })[] = []

    for (const ts of ordered) {
      const options = candidatesLoose(ts.slot, profile, library, excluded)
      if (!options.length) continue
      // accessories rotate every cycle, main lifts stay for comparable progress
      const offset = (ts.variant ?? 0) + (ts.prio > 1 ? mesoNumber - 1 : 0)
      const prevSlot = opts.previous?.days[dayIdx]?.slots.find((p) => p.slot === ts.slot)
      let pick: Exercise | undefined
      if (ts.prio === 1 && prevSlot) pick = options.find((o) => o.id === prevSlot.exerciseId)
      if (!pick) {
        const rotated = options.map((_, i) => options[(i + offset) % options.length])
        pick = rotated.find((o) => !usedInMeso.has(o.id) || options.length === 1) ?? rotated[0]
      }
      const [repMin, repMax] = repRange(profile.goal, pick)
      const candidate: PlanSlot & { prio: Prio } = {
        key: uid(),
        slot: ts.slot,
        exerciseId: pick.id,
        sets: baseSets(ts.prio, profile.level) + (ts.prio === 1 ? bonus : 0),
        repMin,
        repMax,
        restSec: restFor(profile.goal, pick),
        prio: ts.prio,
      }
      const trial = [...chosen, candidate]
      if (pairing) assignSupersets(trial)
      if (chosen.length >= 3 && slotSeconds(trial, pairing) > budget) continue
      chosen.push(candidate)
      if (pairing) assignSupersets(chosen)
      usedInMeso.add(pick.id)
    }

    // spend leftover time on extra sets for the important lifts
    const cap = profile.level === 'profi' ? 5 : 4
    let grew = true
    while (grew) {
      grew = false
      for (const prio of [1, 2] as Prio[]) {
        for (const sl of chosen.filter((c) => c.prio === prio)) {
          if (sl.sets >= cap) continue
          sl.sets++
          if (slotSeconds(chosen, pairing) > budget) sl.sets--
          else grew = true
        }
      }
    }

    return {
      id: uid(),
      key: tpl.key,
      name: tpl.name,
      focus: tpl.focus,
      slots: chosen.map(({ prio: _prio, ...rest }) => rest),
    }
  })

  return {
    id: uid(),
    number: mesoNumber,
    startDate: new Date().toISOString(),
    weeks: mesoWeeks(profile.level),
    splitKey: split.key,
    split: split.name,
    days,
    completed: false,
  }
}

export function estimateMinutes(day: PlanDay): number {
  return Math.round(slotSeconds(day.slots, day.slots.some((s) => s.superset)) / 60)
}

/** Target reps in reserve for a week of the cycle. Last week is the deload. */
export function targetRir(week: number, weeks: number, level: Level): number {
  if (week >= weeks - 1) return 4
  const build = weeks - 1
  const start = 3
  const end = level === 'profi' ? 0 : 1
  if (build <= 1) return start
  return Math.round(start - ((start - end) * week) / (build - 1))
}

export function isDeload(week: number, weeks: number): boolean {
  return week >= weeks - 1
}

/** Sets for this week: base in the first half, +1 for compounds in the second half, halved in deload. */
export function weekSets(base: number, week: number, weeks: number, compound: boolean): number {
  if (isDeload(week, weeks)) return Math.max(1, Math.ceil(base / 2))
  const build = weeks - 1
  return base + (compound && week >= Math.ceil(build / 2) ? 1 : 0)
}
