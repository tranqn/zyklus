import { EXERCISES, hasEquipment, levelAllows } from './exercises'
import { mesoWeeks, repRange, restFor, type GenerateOptions } from './planner'
import type { Exercise, Mesocycle, PlanDay, PlanSlot, Profile, Slot } from './types'
import { uid } from './util'

/**
 * Winter Arc: eight bodyweight exercises from Kevin Zhang (Calisthenics Nerd), "The Only 8 Exercises
 * and 3 Meals You Need to Build an Anime Physique". The video names the exercises only; days, sets
 * and pairing are ours. Each exercise is a ladder: the target first, then easier regressions.
 */
type Move = 'pull' | 'dips' | 'row' | 'pike' | 'decline' | 'pistol' | 'hinge' | 'flag'

interface PresetSlot {
  prefer: string[]
  /** used when no exercise of the ladder fits the equipment */
  fallbackSlot: Slot
}

const LADDER: Record<Move, PresetSlot> = {
  pull: { prefer: ['klimmzuege', 'klimmzug-negativ'], fallbackSlot: 'ruecken_vertikal' },
  dips: { prefer: ['dips-brust', 'bankdips'], fallbackSlot: 'brust_compound' },
  row: { prefer: ['rudern-kammgriff', 'umgekehrtes-rudern'], fallbackSlot: 'ruecken_horizontal' },
  pike: { prefer: ['pike-liegestuetze'], fallbackSlot: 'schulter_press' },
  decline: { prefer: ['decline-defizit-liegestuetze', 'liegestuetze-erhoeht', 'liegestuetze'], fallbackSlot: 'brust_schraeg' },
  pistol: { prefer: ['pistol-squat', 'pistol-box', 'bulgarian-kg'], fallbackSlot: 'unilateral_bein' },
  hinge: { prefer: ['hueftbeuge-fixiert'], fallbackSlot: 'hinge' },
  flag: { prefer: ['dragon-flag', 'dragon-flag-tuck', 'beinheben-liegend'], fallbackSlot: 'bauch' },
}

/** Rep ranges where the generic bodyweight range does not fit (pistols per leg). */
const REPS: Record<string, [number, number]> = {
  'pistol-squat': [5, 10],
  'pistol-box': [6, 12],
  'hueftbeuge-fixiert': [8, 12],
  'dragon-flag': [4, 8],
  'dragon-flag-tuck': [5, 10],
}

/** Antagonist pairs, always done as supersets. */
const P1: [Move, Move] = ['pull', 'dips']
const P2: [Move, Move] = ['row', 'pike']
const P3: [Move, Move] = ['decline', 'pistol']
const P4: [Move, Move] = ['hinge', 'flag']

interface PresetDay {
  key: string
  name: string
  focus: string
  pairs: [Move, Move][]
}

const WA_A: PresetDay = { key: 'wa_a', name: 'Winter Arc A', focus: 'Ganzkörper, Zug zuerst', pairs: [P1, P2, P3, P4] }
const WA_B: PresetDay = { key: 'wa_b', name: 'Winter Arc B', focus: 'Ganzkörper, Beine zuerst', pairs: [P3, P4, P1, P2] }
const WA_C: PresetDay = { key: 'wa_c', name: 'Winter Arc C', focus: 'Ganzkörper, Schultern zuerst', pairs: [P2, P4, P1, P3] }
const WA_1: PresetDay = { key: 'wa_1', name: 'Winter Arc 1', focus: 'Klimmzüge, Dips, Liegestütze, Pistols', pairs: [P1, P3] }
const WA_2: PresetDay = { key: 'wa_2', name: 'Winter Arc 2', focus: 'Rudern, Pike, Hüftbeuge, Dragon Flag', pairs: [P2, P4] }

export function winterArcDays(days: number): PresetDay[] {
  if (days <= 2) return [WA_A, WA_B]
  if (days === 3) return [WA_A, WA_B, WA_C]
  if (days === 4) return [WA_1, WA_2, WA_1, WA_2]
  if (days === 5) return [WA_1, WA_2, WA_1, WA_2, WA_A]
  return [WA_1, WA_2, WA_1, WA_2, WA_1, WA_2]
}

function usable(e: Exercise | undefined, profile: Profile, excluded: string[]): e is Exercise {
  return !!e && !excluded.includes(e.id) && hasEquipment(profile.equipment, e)
}

/** First rung of the ladder the user can do; then any rung with the right equipment; then the fallback slot. */
export function pickRung(move: Move, profile: Profile, library: Exercise[], excluded: string[]): Exercise | undefined {
  const byId = new Map(library.map((e) => [e.id, e]))
  const ladder = LADDER[move].prefer.map((id) => byId.get(id)).filter((e) => usable(e, profile, excluded))
  const rung = ladder.find((e) => levelAllows(profile.level, e.minLevel)) ?? ladder[ladder.length - 1]
  if (rung) return rung
  const slot = library.filter((e) => e.slot === LADDER[move].fallbackSlot && usable(e, profile, excluded))
  return slot.find((e) => levelAllows(profile.level, e.minLevel)) ?? slot[0]
}

export function generateWinterArc(profile: Profile, opts: GenerateOptions = {}): Mesocycle {
  const library = opts.library ?? EXERCISES
  const excluded = opts.excluded ?? []
  const cap = profile.level === 'profi' ? 5 : 4
  const sets = Math.min(cap, (profile.level === 'anfaenger' ? 2 : 3) + (opts.volumeBonus ?? 0))
  const previous = opts.previous?.program === 'winter_arc' ? opts.previous : undefined
  const byId = new Map(library.map((e) => [e.id, e]))

  const days: PlanDay[] = winterArcDays(profile.daysPerWeek).map((tpl, dayIdx) => {
    const kept = new Set<string>()
    const slots: PlanSlot[] = []
    let letter = 0
    for (const pair of tpl.pairs) {
      const chosen: PlanSlot[] = []
      for (const move of pair) {
        let pick = pickRung(move, profile, library, excluded)
        if (!pick) continue
        // an exercise the user swapped in by hand stays; ladder rungs are re-picked so the level can move up
        const prev = previous?.days[dayIdx]?.slots.find((p) => p.slot === pick!.slot && !kept.has(p.key))
        const prevEx = prev && byId.get(prev.exerciseId)
        if (prev && usable(prevEx, profile, excluded) && !LADDER[move].prefer.includes(prevEx.id)) {
          kept.add(prev.key)
          pick = prevEx
        }
        const [repMin, repMax] = REPS[pick.id] ?? repRange(profile.goal, pick)
        chosen.push({ key: uid(), slot: pick.slot, exerciseId: pick.id, sets, repMin, repMax, restSec: restFor(profile.goal, pick) })
      }
      if (chosen.length === 2) {
        const tag = String.fromCharCode(65 + letter++)
        for (const c of chosen) c.superset = tag
      }
      slots.push(...chosen)
    }
    return { id: uid(), key: tpl.key, name: tpl.name, focus: tpl.focus, slots }
  })

  return {
    id: uid(),
    number: opts.mesoNumber ?? 1,
    startDate: new Date().toISOString(),
    weeks: mesoWeeks(profile.level),
    splitKey: 'wa',
    split: 'Winter Arc',
    program: 'winter_arc',
    days,
    completed: false,
  }
}
