export type Goal = 'muskelaufbau' | 'fettabbau' | 'rekomposition' | 'kraft'
export type Level = 'anfaenger' | 'fortgeschritten' | 'profi'
export type Location = 'studio' | 'zuhause'
export type Sex = 'm' | 'w'

export type Equipment =
  | 'langhantel'
  | 'kurzhantel'
  | 'bank'
  | 'kabel'
  | 'maschine'
  | 'klimmzugstange'
  | 'dipbarren'
  | 'baender'
  | 'kettlebell'
  | 'koerpergewicht'

export type Muscle =
  | 'brust'
  | 'ruecken'
  | 'schultern'
  | 'bizeps'
  | 'trizeps'
  | 'quadrizeps'
  | 'beinbeuger'
  | 'gesaess'
  | 'waden'
  | 'bauch'
  | 'unterarme'

/** Exercises sharing a slot are interchangeable (used for swapping and plan generation). */
export type Slot =
  | 'brust_compound'
  | 'brust_schraeg'
  | 'brust_iso'
  | 'ruecken_vertikal'
  | 'ruecken_horizontal'
  | 'schulter_press'
  | 'seitheben'
  | 'hintere_schulter'
  | 'bizeps'
  | 'trizeps'
  | 'kniebeuge'
  | 'hinge'
  | 'unilateral_bein'
  | 'quad_iso'
  | 'beinbeuger_iso'
  | 'gesaess_iso'
  | 'waden'
  | 'bauch'
  | 'unterarme'

export type LoadType = 'gewicht' | 'koerpergewicht'

export interface Exercise {
  id: string
  name: string
  slot: Slot
  primary: Muscle
  secondary: Muscle[]
  /** All listed items are required. */
  equipment: Equipment[]
  loadType: LoadType
  compound: boolean
  /** Smallest sensible load jump in kg. */
  increment: number
  minLevel: Level
  cues: string[]
  custom?: boolean
}

export interface Profile {
  name: string
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  /** PAL factor without training (1.2 to 1.7). */
  activity: number
  goal: Goal
  level: Level
  location: Location
  equipment: Equipment[]
  daysPerWeek: number
  sessionMinutes: number
  /** 0 = Montag ... 6 = Sonntag */
  trainingDays: number[]
  createdAt: string
}

export interface PlanSlot {
  key: string
  slot: Slot
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  restSec: number
  /** Exercises with the same superset letter are done back to back. */
  superset?: string
}

export interface PlanDay {
  id: string
  name: string
  focus: string
  slots: PlanSlot[]
}

export interface Mesocycle {
  id: string
  number: number
  startDate: string
  /** Total weeks including the final deload week. */
  weeks: number
  split: string
  days: PlanDay[]
  completed: boolean
  pausedSince?: string
}

export type SetKind = 'aufwaermen' | 'arbeit' | 'test'

export interface SetEntry {
  kind: SetKind
  targetWeight?: number
  targetReps: number
  targetRir: number
  weight?: number
  reps?: number
  rir?: number
  done: boolean
}

export interface SessionExercise {
  key: string
  exerciseId: string
  slot: Slot
  repMin: number
  repMax: number
  restSec: number
  superset?: string
  note?: string
  sets: SetEntry[]
}

export interface CheckIn {
  date: string
  sleep: number
  energy: number
  stress: number
  /** 0 = kein, 1 = leicht, 2 = deutlich, 3 = stark */
  soreness: Partial<Record<Muscle, number>>
}

export interface WorkoutSession {
  id: string
  mesoId: string
  planDayId: string
  dayName: string
  week: number
  deload: boolean
  date: string
  startedAt: string
  finishedAt?: string
  checkIn?: CheckIn
  readiness?: number
  exercises: SessionExercise[]
  rating?: number
  notes?: string
}

export type Meal = 'fruehstueck' | 'mittag' | 'abend' | 'snack'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Food {
  id: string
  name: string
  brand?: string
  per100: Macros
  /** Typical portion in g (e.g. 1 egg = 60). */
  portion?: number
  portionLabel?: string
  barcode?: string
  custom?: boolean
}

export interface FoodEntry {
  id: string
  date: string
  meal: Meal
  foodId?: string
  name: string
  grams: number
  per100: Macros
}

export interface WeightEntry {
  date: string
  kg: number
}

export interface CardioEntry {
  id: string
  date: string
  activityId: string
  minutes: number
  intensity: 1 | 2 | 3
  kcal: number
}

export interface MobilityEntry {
  id: string
  date: string
  routineId: string
  minutes: number
}

export type Mode = 'normal' | 'urlaub' | 'krank'

export interface Settings {
  restTimerSound: boolean
  restTimerVibrate: boolean
  warmupSets: boolean
  kcalOverride?: number
  excludedExercises: string[]
  mode: Mode
  modeSince?: string
  /** First session after vacation/sick mode runs lighter. */
  reentryPending?: boolean
}

export interface RecipeItem {
  foodId?: string
  name: string
  grams: number
  per100: Macros
}

/** A saved meal; logging one portion adds every item scaled by 1/servings. */
export interface Recipe {
  id: string
  name: string
  servings: number
  items: RecipeItem[]
}

export interface Supplement {
  id: string
  name: string
  dose: string
}

export type MeasureSite = 'taille' | 'huefte' | 'brust' | 'oberarm' | 'oberschenkel' | 'wade' | 'koerperfett'

export interface Measurement {
  date: string
  values: Partial<Record<MeasureSite, number>>
}
