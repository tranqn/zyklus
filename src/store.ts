import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { EXERCISES } from './domain/exercises'
import { generateMesocycle } from './domain/planner'
import { applyTestResult, bestE1rm, cyclePosition } from './domain/progression'
import type {
  CardioEntry,
  CheckIn,
  Exercise,
  Food,
  FoodEntry,
  Measurement,
  Mesocycle,
  MobilityEntry,
  Recipe,
  Supplement,
  Mode,
  PlanSlot,
  Profile,
  SetEntry,
  Settings,
  WeightEntry,
  WorkoutSession,
} from './domain/types'
import type { PlannedMeal } from './domain/meals'
import { addDays, daysBetween, nowMs, sessionEndMs, startOfWeek, today, uid } from './domain/util'
import { defaultWeeklyGoal, withWeeklyGoal } from './domain/motivation'
import { COLLECTIONS } from './sync/merge'
import { discardStash } from './sync/stash'

/** The account a device's data belongs to (see sync/engine.ts). */
export interface DataOwner {
  origin: string
  id: number
  /** tells a re-created account apart that got the id of a deleted one */
  createdAt: number
}

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
  recipes: Recipe[]
  supplements: Supplement[]
  /** date -> ids of supplements taken that day */
  supplementLog: Record<string, string[]>
  measurements: Measurement[]
  /** meal planner: one item per day and meal slot */
  mealPlan: PlannedMeal[]
  /** shopping list items ticked off, as `${weekStart}:${foodId}` */
  shoppingChecked: string[]
  settings: Settings
  /** Days frozen by vacation/sick mode, so the streak survives them. */
  frozenDays: string[]
  /** Change stamps and tombstones for account sync (see sync/merge.ts). */
  syncMeta: { stamps: Record<string, number>; tombstones: Record<string, number> }
  /**
   * The account this data belongs to. Saved in the same localStorage entry as the data, so a tab
   * can never pair one account's data with another account's binding. Not user data: never
   * synced, never in a backup, not changed by reset or a restore.
   */
  owner?: DataOwner
  /**
   * The server revision this data was last merged with. Stored with the data for the same reason
   * as `owner`: a tab that paired one tab's data with another tab's revision could upload over
   * changes it never merged. Not user data either.
   */
  rev?: number
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
  addFoods(entries: Omit<FoodEntry, 'id'>[]): void
  /** replaces the not yet logged meals on these dates */
  setMealPlan(dates: string[], meals: PlannedMeal[]): void
  updatePlannedMeal(id: string, patch: Partial<PlannedMeal>): void
  /** logs a planned meal into the diary (entries computed by the caller) */
  logPlannedMeal(id: string, entries: Omit<FoodEntry, 'id'>[]): void
  toggleShopping(key: string): void
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
  saveRecipe(r: Recipe): void
  removeRecipe(id: string): void
  logRecipe(r: Recipe, portions: number, date: string, meal: FoodEntry['meal']): void
  copyMeal(fromDate: string, toDate: string, meal: FoodEntry['meal']): number
  addSupplement(s: Omit<Supplement, 'id'>): void
  removeSupplement(id: string): void
  toggleSupplement(id: string, date?: string): void
  logMeasurement(m: Measurement): void
  removeMeasurement(date: string): void
  updateSettings(s: Partial<Settings>): void
  setMode(mode: Mode): void
  /** weekly flame goal in active days, applies from this week on */
  setWeeklyGoal(days: number): void
  importData(json: string): void
  reset(): void
}

/** localStorage, or an in-memory stand-in when it is missing or blocked (private mode, tests). */
function safeStorage(): StateStorage {
  try {
    const ls = globalThis.localStorage
    if (ls) {
      ls.getItem('zyklus-probe')
      return ls
    }
  } catch {
    /* blocked */
  }
  const mem = new Map<string, string>()
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  }
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
  recipes: [],
  supplements: [],
  supplementLog: {},
  measurements: [],
  mealPlan: [],
  shoppingChecked: [],
  settings: {
    restTimerSound: true,
    restTimerVibrate: true,
    warmupSets: true,
    excludedExercises: [],
    mode: 'normal',
  },
  frozenDays: [],
  syncMeta: { stamps: {}, tombstones: {} },
}

function unbooked<T extends Partial<FoodEntry>>(f: T): T {
  const out = { ...f }
  delete out.planSlot
  delete out.booking
  return out
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
        // a goal that follows the plan moves with the training days, from this week on
        const goals = s.settings.weeklyGoals
        const following = !goals?.length || goals[goals.length - 1].days === defaultWeeklyGoal(s.profile)
        const settings =
          following && defaultWeeklyGoal(profile) !== defaultWeeklyGoal(s.profile)
            ? { ...s.settings, weeklyGoals: withWeeklyGoal(goals, defaultWeeklyGoal(s.profile), defaultWeeklyGoal(profile), startOfWeek(today())) }
            : s.settings
        set({ profile, settings })
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
                    noteKey: 'swapped',
                    noteParams: undefined,
                    note: undefined,
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
        const done: WorkoutSession = { ...s.active, finishedAt: new Date(sessionEndMs(s.active.startedAt, nowMs())).toISOString(), rating, notes }
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

      // An added entry is never part of a planned meal's booking, even when it was spread from a
      // booked one ("eat again"): only logPlannedMeal books, see normalize in sync/merge.ts.
      addFood(e) {
        set((s) => ({ foods: [...s.foods, { ...unbooked(e), id: uid() }] }))
      },
      addFoods(entries) {
        set((s) => ({ foods: [...s.foods, ...entries.map((e) => ({ ...unbooked(e), id: uid() }))] }))
      },
      setMealPlan(dates, meals) {
        const days = new Set(dates)
        // plans older than five weeks are dropped; logged meals stay as they were eaten
        const keepFrom = addDays(today(), -35)
        set((s) => {
          const kept = s.mealPlan.filter((p) => p.date >= keepFrom && (!days.has(p.date) || p.logged))
          const taken = new Set(kept.map((p) => p.id))
          return { mealPlan: [...kept, ...meals.filter((m) => !taken.has(m.id))] }
        })
      },
      updatePlannedMeal(id, patch) {
        set((s) => ({ mealPlan: s.mealPlan.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
      },
      logPlannedMeal(id, entries) {
        // One booking per slot: a fresh booking id, entries with ids derived from it, and the
        // slot's earlier entries removed. When two devices book the same slot, the merge keeps
        // the entries of the booking whose plan item wins (see normalize in sync/merge.ts).
        const booking = uid()
        set((s) => ({
          foods: [...s.foods.filter((f) => f.planSlot !== id), ...entries.map((e, n) => ({ ...e, id: `mp:${id}:${booking}:${n}`, planSlot: id, booking }))],
          mealPlan: s.mealPlan.map((p) => (p.id === id ? { ...p, logged: true, booking } : p)),
        }))
      },
      toggleShopping(key) {
        // ticks from weeks that are over are dropped along the way
        const from = addDays(today(), -14)
        set((s) => ({ shoppingChecked: s.shoppingChecked.includes(key) ? s.shoppingChecked.filter((k) => k !== key) : [...s.shoppingChecked.filter((k) => k.slice(0, 10) >= from), key] }))
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

      saveRecipe(r) {
        set((s) => ({ recipes: [...s.recipes.filter((x) => x.id !== r.id), r] }))
      },
      removeRecipe(id) {
        set((s) => ({ recipes: s.recipes.filter((x) => x.id !== id) }))
      },
      logRecipe(r, portions, date, meal) {
        const factor = portions / Math.max(1, r.servings)
        set((s) => ({
          foods: [
            ...s.foods,
            ...r.items.map((it) => ({ id: uid(), date, meal, foodId: it.foodId, name: it.name, grams: Math.round(it.grams * factor), per100: it.per100 })),
          ],
        }))
      },
      copyMeal(fromDate, toDate, meal) {
        const src = get().foods.filter((f) => f.date === fromDate && f.meal === meal)
        // a copy is an ordinary entry, not part of the planned meal's booking
        set((s) => ({ foods: [...s.foods, ...src.map((f) => ({ ...unbooked(f), id: uid(), date: toDate }))] }))
        return src.length
      },

      addSupplement(sup) {
        set((s) => ({ supplements: [...s.supplements, { ...sup, id: uid() }] }))
      },
      removeSupplement(id) {
        set((s) => ({ supplements: s.supplements.filter((x) => x.id !== id) }))
      },
      toggleSupplement(id, date = today()) {
        set((s) => {
          const taken = s.supplementLog[date] ?? []
          const next = taken.includes(id) ? taken.filter((x) => x !== id) : [...taken, id]
          return { supplementLog: { ...s.supplementLog, [date]: next } }
        })
      },

      logMeasurement(m) {
        set((s) => ({ measurements: [...s.measurements.filter((x) => x.date !== m.date), m].sort((a, b) => a.date.localeCompare(b.date)) }))
      },
      removeMeasurement(date) {
        set((s) => ({ measurements: s.measurements.filter((x) => x.date !== date) }))
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

      setWeeklyGoal(days) {
        const s = get()
        const weeklyGoals = withWeeklyGoal(s.settings.weeklyGoals, defaultWeeklyGoal(s.profile), Math.min(7, Math.max(1, days)), startOfWeek(today()))
        set({ settings: { ...s.settings, weeklyGoals } })
      },

      importData(json) {
        const data = parseBackup(json)
        // Only the data keys the file has: what an older backup does not know yet (the meal plan,
        // say) keeps its current value. syncMeta is never taken from a file: the current stamps
        // and tombstones stay, and the sync tracker stamps the restored values as a normal local
        // change, so they win on other devices. Items in the backup come back even if they were
        // deleted after it (that is what restoring means); items deleted after the backup that
        // are not in it stay deleted, because their tombstones are kept.
        const patch: Record<string, unknown> = {}
        for (const k of DATA_KEYS) if (k in data) patch[k] = data[k]
        if (data.settings) patch.settings = { ...initial.settings, ...data.settings }
        set(patch as Partial<State>)
      },

      reset() {
        // "delete all data" includes data kept from before an account switch
        discardStash()
        set({ ...initial })
      },
    }),
    {
      name: 'zyklus-v1',
      storage: createJSONStorage(safeStorage),
      version: 1,
      partialize: (s) => {
        const out: Partial<State> = {}
        for (const k of Object.keys(initial).concat(['profile', 'meso', 'active', 'owner', 'rev']) as (keyof State)[]) {
          ;(out as Record<string, unknown>)[k] = s[k]
        }
        return out as State
      },
    },
  ),
)

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
/** Keys every backup has had since the first release (5f9a617), with their types. */
const BACKUP_LISTS = ['pastMesos', 'sessions', 'checkIns', 'foods', 'customFoods', 'customExercises', 'weights', 'cardio', 'mobility', 'frozenDays'] as const

/**
 * Parse and check a backup file before anything is written: the core keys of the oldest backup
 * format with the right types, every collection present a list of objects with their id field,
 * objects where objects belong. Partial files such as `{"sessions": []}` are rejected.
 */
export function parseBackup(json: string): Partial<State> {
  const invalid = () => new Error('Keine gültige Zyklus-Sicherung')
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw invalid()
  }
  if (!isObject(data)) throw invalid()
  if (typeof data.version !== 'number' || typeof data.kcalAdjustment !== 'number' || !isObject(data.settings)) throw invalid()
  for (const k of BACKUP_LISTS) if (!Array.isArray(data[k])) throw invalid()
  for (const [coll, field] of Object.entries(COLLECTIONS)) {
    if (!(coll in data)) continue
    const list = data[coll]
    if (!Array.isArray(list) || !list.every((it) => isObject(it) && (typeof it[field] === 'string' || typeof it[field] === 'number'))) throw invalid()
  }
  for (const k of ['profile', 'meso', 'active', 'supplementLog']) if (k in data && !isObject(data[k])) throw invalid()
  for (const k of ['frozenDays', 'shoppingChecked']) if (k in data && !(Array.isArray(data[k]) && (data[k] as unknown[]).every((x) => typeof x === 'string'))) throw invalid()
  return data as Partial<State>
}

/** Keys that make up the user's data (everything persisted except sync bookkeeping). */
export const DATA_KEYS = [...Object.keys(initial).filter((k) => k !== 'syncMeta'), 'profile', 'meso', 'active'] as (keyof State)[]

/** The backup file: the persisted store without functions and without the account binding. */
export function backupOf(s: State): Record<string, unknown> {
  return Object.fromEntries(Object.entries(s).filter(([k, v]) => typeof v !== 'function' && k !== 'owner' && k !== 'rev'))
}

/** A fresh, empty state (used when switching accounts). */
export function emptyState(): State {
  return structuredClone(initial)
}

export function allExercises(s: Pick<State, 'customExercises'>): Exercise[] {
  return [...EXERCISES, ...s.customExercises]
}

export function exerciseMap(s: Pick<State, 'customExercises'>): Map<string, Exercise> {
  return new Map(allExercises(s).map((e) => [e.id, e]))
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
