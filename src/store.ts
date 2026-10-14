import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { EXERCISES } from './domain/exercises'
import { FOODS } from './domain/foods'
import { generateMesocycle } from './domain/planner'
import { applyTestResult, bestE1rm, cyclePosition } from './domain/progression'
import type {
  CardioEntry,
  CheckIn,
  Exercise,
  Food,
  FoodEntry,
  Mesocycle,
  MobilityEntry,
  Mode,
  PlanSlot,
  Profile,
  SetEntry,
  Settings,
  WeightEntry,
  WorkoutSession,
} from './domain/types'
import { addDays, daysBetween, today, uid } from './domain/util'

export interface State {
  version: number
  profile?: Profile
  meso?: Mesocycle
  pastMesos: Mesocycle[]
  sessions: WorkoutSession[]
  active?: WorkoutSession
  checkIns: CheckIn[]
  foods: FoodEntry[]
  customFoods: Food[]
  customExercises: Exercise[]
  weights: WeightEntry[]
  cardio: CardioEntry[]
  mobility: MobilityEntry[]
  kcalAdjustment: number
  settings: Settings
  /** Days frozen by vacation/sick mode, so the streak survives them. */
  frozenDays: string[]
}

interface Actions {
  completeOnboarding(p: Profile): void
  updateProfile(p: Partial<Profile>, regenerate?: boolean): void
  startSession(s: WorkoutSession): void
  updateSet(exKey: string, setIdx: number, patch: Partial<SetEntry>): void
  addSet(exKey: string): void
  removeSet(exKey: string, setIdx: number): void
  swapExercise(exKey: string, exerciseId: string, permanent: boolean): void
  finishSession(rating?: number, notes?: string): void
  discardSession(): void
  deleteSession(id: string): void
  editPlanSlot(dayId: string, slotKey: string, patch: Partial<PlanSlot>): void
  addPlanSlot(dayId: string, slot: PlanSlot): void
  removePlanSlot(dayId: string, slotKey: string): void
  movePlanSlot(dayId: string, slotKey: string, dir: -1 | 1): void
  startNextMeso(volumeBonus: number): void
  regeneratePlan(): void
  saveCheckIn(c: CheckIn): void
  addFood(e: Omit<FoodEntry, 'id'>): void
  updateFood(id: string, patch: Partial<FoodEntry>): void
  removeFood(id: string): void
  saveCustomFood(f: Food): void
  addCustomExercise(e: Exercise): void
  logWeight(kg: number, date?: string): void
  removeWeight(date: string): void
  addCardio(e: Omit<CardioEntry, 'id'>): void
  removeCardio(id: string): void
  addMobility(e: Omit<MobilityEntry, 'id'>): void
  setKcalAdjustment(delta: number): void
  updateSettings(s: Partial<Settings>): void
  setMode(mode: Mode): void
  importData(json: string): void
  reset(): void
}

const initial: State = {
  version: 1,
  pastMesos: [],
  sessions: [],
  checkIns: [],
  foods: [],
  customFoods: [],
  customExercises: [],
  weights: [],
  cardio: [],
  mobility: [],
  kcalAdjustment: 0,
  settings: {
    restTimerSound: true,
    restTimerVibrate: true,
    warmupSets: true,
    excludedExercises: [],
    mode: 'normal',
  },
  frozenDays: [],
}

function mapActive(s: State, exKey: string, fn: (sets: SetEntry[]) => SetEntry[]): Partial<State> {
  if (!s.active) return {}
  return {
    active: {
      ...s.active,
      exercises: s.active.exercises.map((e) => (e.key === exKey ? { ...e, sets: fn(e.sets) } : e)),
    },
  }
}

function mapDay(s: State, dayId: string, fn: (slots: PlanSlot[]) => PlanSlot[]): Partial<State> {
  if (!s.meso) return {}
  return { meso: { ...s.meso, days: s.meso.days.map((d) => (d.id === dayId ? { ...d, slots: fn(d.slots) } : d)) } }
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      completeOnboarding(p) {
        const meso = generateMesocycle(p, { library: allExercises(get()), excluded: get().settings.excludedExercises })
        set({ profile: p, meso, weights: [{ date: today(), kg: p.weightKg }] })
      },

      updateProfile(patch, regenerate = false) {
        const s = get()
        if (!s.profile) return
        const profile = { ...s.profile, ...patch }
        set({ profile })
        if (regenerate) get().regeneratePlan()
      },

      startSession(session) {
        set({ active: session })
      },

      updateSet(exKey, setIdx, patch) {
        set((s) => {
          const next = mapActive(s, exKey, (sets) => sets.map((x, i) => (i === setIdx ? { ...x, ...patch } : x)))
          // a finished test set calibrates the remaining sets
          const active = next.active
          if (active && patch.done) {
            const se = active.exercises.find((e) => e.key === exKey)
            const ex = se && allExercises(s).find((x) => x.id === se.exerciseId)
            if (se && ex && se.sets[setIdx]?.kind === 'test') {
              next.active = { ...active, exercises: active.exercises.map((e) => (e.key === exKey ? applyTestResult(e, ex.increment) : e)) }
            }
          }
          return next
        })
      },

      addSet(exKey) {
        set((s) =>
          mapActive(s, exKey, (sets) => {
            const last = [...sets].reverse().find((x) => x.kind !== 'aufwaermen') ?? sets[sets.length - 1]
            return [...sets, { ...last, kind: 'arbeit', done: false, weight: undefined, reps: undefined, rir: undefined }]
          }),
        )
      },

      removeSet(exKey, setIdx) {
        set((s) => mapActive(s, exKey, (sets) => sets.filter((_, i) => i !== setIdx)))
      },

      swapExercise(exKey, exerciseId, permanent) {
        set((s) => {
          if (!s.active) return {}
          const active = {
            ...s.active,
            exercises: s.active.exercises.map((e) =>
              e.key === exKey
                ? {
                    ...e,
                    exerciseId,
                    note: 'Übung getauscht: Gewicht im ersten Satz neu finden.',
                    sets: e.sets
                      .filter((x) => x.kind !== 'aufwaermen')
                      .map((x, i) => ({ ...x, kind: i === 0 ? ('test' as const) : ('arbeit' as const), targetWeight: undefined, done: false })),
                  }
                : e,
            ),
          }
          const patch: Partial<State> = { active }
          if (permanent && s.meso) {
            patch.meso = {
              ...s.meso,
              days: s.meso.days.map((d) => ({ ...d, slots: d.slots.map((sl) => (sl.key === exKey ? { ...sl, exerciseId } : sl)) })),
            }
          }
          return patch
        })
      },

      finishSession(rating, notes) {
        const s = get()
        if (!s.active) return
        const done: WorkoutSession = { ...s.active, finishedAt: new Date().toISOString(), rating, notes }
        // drop untouched sets so history only holds what happened
        done.exercises = done.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length)
        const sessions = [...s.sessions, done]
        let meso = s.meso
        if (meso && cyclePosition(meso, sessions).finished) meso = { ...meso, completed: true }
        set({ sessions, active: undefined, meso })
      },

      discardSession() {
        set({ active: undefined })
      },

      deleteSession(id) {
        set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }))
      },

      editPlanSlot(dayId, slotKey, patch) {
        set((s) => mapDay(s, dayId, (slots) => slots.map((sl) => (sl.key === slotKey ? { ...sl, ...patch } : sl))))
      },

      addPlanSlot(dayId, slot) {
        set((s) => mapDay(s, dayId, (slots) => [...slots, slot]))
      },

      removePlanSlot(dayId, slotKey) {
        set((s) => mapDay(s, dayId, (slots) => slots.filter((sl) => sl.key !== slotKey)))
      },

      movePlanSlot(dayId, slotKey, dir) {
        set((s) =>
          mapDay(s, dayId, (slots) => {
            const i = slots.findIndex((sl) => sl.key === slotKey)
            const j = i + dir
            if (i < 0 || j < 0 || j >= slots.length) return slots
            const next = [...slots]
            ;[next[i], next[j]] = [next[j], next[i]]
            return next
          }),
        )
      },

      startNextMeso(volumeBonus) {
        const s = get()
        if (!s.profile || !s.meso) return
        const meso = generateMesocycle(s.profile, {
          mesoNumber: s.meso.number + 1,
          library: allExercises(s),
          excluded: s.settings.excludedExercises,
          volumeBonus,
          previous: s.meso,
        })
        set({ pastMesos: [...s.pastMesos, { ...s.meso, completed: true }], meso })
      },

      regeneratePlan() {
        const s = get()
        if (!s.profile) return
        const number = s.meso?.number ?? 1
        const meso = generateMesocycle(s.profile, { mesoNumber: number, library: allExercises(s), excluded: s.settings.excludedExercises })
        // keep finished sessions counted against the replaced cycle
        const sessions = s.meso ? s.sessions.map((x) => (x.mesoId === s.meso!.id ? { ...x, mesoId: meso.id } : x)) : s.sessions
        set({ meso: { ...meso, startDate: s.meso?.startDate ?? meso.startDate }, sessions })
      },

      saveCheckIn(c) {
        set((s) => ({ checkIns: [...s.checkIns.filter((x) => x.date !== c.date), c] }))
      },

      addFood(e) {
        set((s) => ({ foods: [...s.foods, { ...e, id: uid() }] }))
      },
      updateFood(id, patch) {
        set((s) => ({ foods: s.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)) }))
      },
      removeFood(id) {
        set((s) => ({ foods: s.foods.filter((f) => f.id !== id) }))
      },
      saveCustomFood(f) {
        set((s) => ({ customFoods: [...s.customFoods.filter((x) => x.id !== f.id), f] }))
      },
      addCustomExercise(e) {
        set((s) => ({ customExercises: [...s.customExercises, e] }))
      },

      logWeight(kg, date = today()) {
        set((s) => {
          const weights = [...s.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date))
          const latest = weights[weights.length - 1]
          return { weights, profile: s.profile && latest.date === date ? { ...s.profile, weightKg: kg } : s.profile }
        })
      },
      removeWeight(date) {
        set((s) => ({ weights: s.weights.filter((w) => w.date !== date) }))
      },

      addCardio(e) {
        set((s) => ({ cardio: [...s.cardio, { ...e, id: uid() }] }))
      },
      removeCardio(id) {
        set((s) => ({ cardio: s.cardio.filter((c) => c.id !== id) }))
      },
      addMobility(e) {
        set((s) => ({ mobility: [...s.mobility, { ...e, id: uid() }] }))
      },

      setKcalAdjustment(delta) {
        set({ kcalAdjustment: delta })
      },

      updateSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
      },

      setMode(mode) {
        const s = get()
        const prev = s.settings
        const frozen = [...s.frozenDays]
        if (prev.mode !== 'normal' && prev.modeSince) {
          const span = daysBetween(prev.modeSince, today())
          for (let i = 0; i <= span; i++) frozen.push(addDays(prev.modeSince, i))
        }
        set({
          frozenDays: [...new Set(frozen)],
          settings: { ...prev, mode, modeSince: mode === 'normal' ? undefined : today(), reentryPending: prev.mode !== 'normal' && mode === 'normal' },
          meso: s.meso && { ...s.meso, pausedSince: mode === 'normal' ? undefined : today() },
        })
      },

      importData(json) {
        const data = JSON.parse(json) as Partial<State>
        if (typeof data !== 'object' || !data || !('sessions' in data)) throw new Error('Keine gültige Zyklus-Sicherung')
        set({ ...initial, ...data, settings: { ...initial.settings, ...(data.settings ?? {}) } })
      },

      reset() {
        set({ ...initial })
      },
    }),
    {
      name: 'zyklus-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => {
        const out: Partial<State> = {}
        for (const k of Object.keys(initial).concat(['profile', 'meso', 'active']) as (keyof State)[]) {
          ;(out as Record<string, unknown>)[k] = s[k]
        }
        return out as State
      },
    },
  ),
)

export function allExercises(s: Pick<State, 'customExercises'>): Exercise[] {
  return [...EXERCISES, ...s.customExercises]
}

export function exerciseMap(s: Pick<State, 'customExercises'>): Map<string, Exercise> {
  return new Map(allExercises(s).map((e) => [e.id, e]))
}

export function allFoods(s: Pick<State, 'customFoods'>): Food[] {
  return [...s.customFoods, ...FOODS]
}

/** Best estimated 1RM per finished session for one exercise (for charts). */
export function e1rmHistory(sessions: WorkoutSession[], exerciseId: string): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = []
  for (const s of sessions) {
    if (!s.finishedAt) continue
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue
      const v = bestE1rm(e)
      if (v) out.push({ date: s.date, value: v })
    }
  }
  return out
}

/** Recently used foods, most recent first, unique by name. */
export function recentFoods(entries: FoodEntry[], limit = 8): FoodEntry[] {
  const seen = new Set<string>()
  const out: FoodEntry[] = []
  for (let i = entries.length - 1; i >= 0 && out.length < limit; i--) {
    const e = entries[i]
    if (seen.has(e.name)) continue
    seen.add(e.name)
    out.push(e)
  }
  return out
}
