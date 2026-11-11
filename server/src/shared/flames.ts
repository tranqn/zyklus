/**
 * Flames (daily and weekly streaks) and achievements, computed from activity only: strength
 * sessions, cardio and mobility count the same. Everything is replayed from the data, nothing
 * is stored, so the app and the API (friends, challenges) always agree.
 *
 * Shared by the app and the API: no imports, only syntax Node's type stripping accepts.
 */

export interface DayActivity {
  /** active minutes of all kinds */
  minutes: number
  /** finished strength sessions */
  strength: number
  cardio: number
  mobility: number
}
export type ActivityLog = Record<string, DayActivity>

export interface WeeklyGoal {
  /** Monday (YYYY-MM-DD) from which this goal applies */
  from: string
  days: number
}

/** Cardio and mobility together need this many minutes for an active day; a strength session always counts. */
export const MIN_MINUTES = 10
export const MAX_SHIELDS = 2
const START_SHIELDS = 1
/** A week with this many paused days (vacation, sick) neither counts nor breaks the weekly flame. */
const PAUSED_WEEK_DAYS = 4
/** A session never counts longer than this (forgotten workouts). */
const MAX_SESSION_MIN = 240
/** A new flame after at least this many days without activity is a comeback. */
const COMEBACK_GAP = 7

// Dates as day numbers since 1970-01-01 (UTC, no time zone shifts).
const DAY_MS = 86_400_000
export function dayNum(s: string): number {
  return Math.round(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) / DAY_MS)
}
export function dayStr(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}
/** 0 = Monday ... 6 = Sunday (1970-01-01 was a Thursday). */
const weekday = (n: number) => (((n + 3) % 7) + 7) % 7
const mondayOf = (n: number) => n - weekday(n)

/**
 * Longest history a replay walks (ten years). A synced document may carry any date, and a
 * crafted one ("0001-01-01" passes every format check) would otherwise send the day loops below
 * through millions of iterations. On the server that replay runs on behalf of every friend and
 * every challenge member, so one account could stall the API for all of them; the bound lives
 * here because both the app and the API go through these two loops.
 */
export const MAX_REPLAY_DAYS = 3660
const replayStart = (n: number, todayN: number) => (Number.isFinite(n) ? Math.max(n, todayN - MAX_REPLAY_DAYS) : todayN)

interface SessionLike {
  date: string
  startedAt?: string
  finishedAt?: string
  exercises?: { sets?: { done?: boolean }[] }[]
}
interface MinutesLike {
  date: string
  minutes: number
}

/** Activity per day from the synced collections (finished sessions with at least one done set). */
export function activityLog(src: { sessions?: SessionLike[]; cardio?: MinutesLike[]; mobility?: MinutesLike[] }): ActivityLog {
  const log: ActivityLog = {}
  const day = (d: string) => (log[d] ??= { minutes: 0, strength: 0, cardio: 0, mobility: 0 })
  for (const s of src.sessions ?? []) {
    if (!s.finishedAt || !s.exercises?.some((e) => e.sets?.some((x) => x.done))) continue
    const mins = s.startedAt ? (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60_000 : 0
    const d = day(s.date)
    d.strength++
    d.minutes += Math.max(0, Math.min(MAX_SESSION_MIN, Math.round(mins || 0)))
  }
  for (const c of src.cardio ?? []) {
    const m = Math.max(0, Number(c.minutes) || 0)
    day(c.date).cardio += m
    day(c.date).minutes += m
  }
  for (const m of src.mobility ?? []) {
    const v = Math.max(0, Number(m.minutes) || 0)
    day(m.date).mobility += v
    day(m.date).minutes += v
  }
  return log
}

export function isActive(d: DayActivity | undefined): boolean {
  return !!d && (d.strength > 0 || d.cardio + d.mobility >= MIN_MINUTES)
}

/** Weekly goal that applies to the week starting at `monday`; weeks before the first entry use the default. */
export function goalFor(goals: WeeklyGoal[] | undefined, monday: string, fallback: number): number {
  let g = fallback
  for (const x of [...(goals ?? [])].sort((a, b) => a.from.localeCompare(b.from))) if (x.from <= monday) g = x.days
  return Math.min(7, Math.max(1, Math.round(g)))
}

/** Vacation and sick days: recorded days plus a mode that is still running since `modeSince`. */
export function pausedDays(frozen: string[] | undefined, mode: string | undefined, modeSince: string | undefined, today: string): string[] {
  const out = [...(frozen ?? [])]
  if (mode && mode !== 'normal' && modeSince) {
    const end = dayNum(today)
    for (let n = replayStart(dayNum(modeSince), end); n <= end; n++) out.push(dayStr(n))
  }
  return out
}

export const ACHIEVEMENTS = [
  { id: 'daily', tiers: [3, 7, 14, 30, 60, 100, 200, 365] },
  { id: 'weekly', tiers: [2, 4, 8, 12, 26, 52] },
  { id: 'days', tiers: [10, 25, 50, 100, 250, 500] },
  { id: 'minutes', tiers: [300, 1000, 3000, 10000] },
  { id: 'variety', tiers: [1, 4, 12] },
  { id: 'comeback', tiers: [1, 3] },
] as const
/** Achievements that need the server: friends and finished challenges (counts, no dates). */
export const SOCIAL_ACHIEVEMENTS = [
  { id: 'friends', tiers: [1, 3, 5] },
  { id: 'team', tiers: [1, 3, 10] },
  { id: 'grit', tiers: [1, 3, 10] },
] as const
export type AchievementId = (typeof ACHIEVEMENTS)[number]['id']
export type SocialAchievementId = (typeof SOCIAL_ACHIEVEMENTS)[number]['id']

export interface Flames {
  daily: {
    count: number
    best: number
    activeToday: boolean
    pausedToday: boolean
    /** flame burns but today has no activity yet */
    atRisk: boolean
    /** flame shields in stock (0 to MAX_SHIELDS) */
    shields: number
    /** missed days a shield covered */
    shieldDays: string[]
  }
  weekly: {
    /** finished weeks in a row, plus this week once its goal is reached */
    count: number
    best: number
    thisWeek: { active: number; goal: number; done: boolean }
  }
  /** progress per achievement family and the dates each tier was reached */
  progress: Record<AchievementId, number>
  unlocked: Record<AchievementId, string[]>
}

export interface FlameOptions {
  today: string
  /** vacation and sick days: they neither count nor break a flame */
  paused?: Iterable<string>
  goals?: WeeklyGoal[]
  defaultGoal: number
}

/** Replays the whole history day by day: flames, shields earned and spent, achievement progress. */
export function computeFlames(log: ActivityLog, opts: FlameOptions): Flames {
  const todayN = dayNum(opts.today)
  const paused = new Set([...(opts.paused ?? [])].map(dayNum))
  const activeDays = Object.keys(log).filter((d) => isActive(log[d])).map(dayNum).filter((n) => n <= todayN).sort((a, b) => a - b)
  const active = new Set(activeDays)

  const progress: Record<AchievementId, number> = { daily: 0, weekly: 0, days: 0, minutes: 0, variety: 0, comeback: 0 }
  const unlocked: Record<AchievementId, string[]> = { daily: [], weekly: [], days: [], minutes: [], variety: [], comeback: [] }
  const reach = (id: AchievementId, value: number, date: number) => {
    if (value <= progress[id]) return
    progress[id] = value
    const tiers = ACHIEVEMENTS.find((a) => a.id === id)!.tiers
    while (unlocked[id].length < tiers.length && value >= tiers[unlocked[id].length]) unlocked[id].push(dayStr(date))
  }

  let daily = 0
  let dailyBest = 0
  let shields = START_SHIELDS
  const shieldDays: string[] = []
  let weekly = 0
  let weeklyBest = 0
  let totalDays = 0
  let totalMinutes = 0
  let varietyWeeks = 0
  let comebacks = 0
  let lastActive: number | undefined

  const week = (monday: number, last: number) => {
    let act = 0
    let pause = 0
    const kinds = { strength: false, cardio: false, mobility: false }
    for (let d = monday; d <= last; d++) {
      const a = log[dayStr(d)]
      if (active.has(d)) act++
      else if (paused.has(d)) pause++
      if (a?.strength) kinds.strength = true
      if (a?.cardio) kinds.cardio = true
      if (a?.mobility) kinds.mobility = true
    }
    return { act, pause, variety: kinds.strength && kinds.cardio && kinds.mobility, goal: goalFor(opts.goals, dayStr(monday), opts.defaultGoal) }
  }

  const first = activeDays[0]
  if (first !== undefined) {
    for (let d = replayStart(first, todayN); d <= todayN; d++) {
      if (active.has(d)) {
        if (daily === 0 && lastActive !== undefined && d - lastActive > COMEBACK_GAP) reach('comeback', ++comebacks, d)
        daily++
        dailyBest = Math.max(dailyBest, daily)
        lastActive = d
        reach('daily', daily, d)
        reach('days', ++totalDays, d)
        totalMinutes += log[dayStr(d)].minutes
        reach('minutes', totalMinutes, d)
      } else if (!paused.has(d) && d !== todayN && daily > 0) {
        if (shields > 0) {
          shields--
          shieldDays.push(dayStr(d))
        } else daily = 0
      }
      // a week closes on Sunday; the running week stays open
      if (weekday(d) === 6 && d < todayN) {
        const w = week(d - 6, d)
        if (w.variety) reach('variety', ++varietyWeeks, d)
        if (w.pause >= PAUSED_WEEK_DAYS) {
          // neutral week
        } else if (w.act >= w.goal) {
          weekly++
          weeklyBest = Math.max(weeklyBest, weekly)
          reach('weekly', weekly, d)
          shields = Math.min(MAX_SHIELDS, shields + 1)
        } else weekly = 0
      }
    }
  }

  const cur = week(mondayOf(todayN), todayN)
  const weekDone = cur.act >= cur.goal
  const weeklyCount = weekly + (weekDone ? 1 : 0)
  if (weekDone) reach('weekly', weeklyCount, todayN)
  if (cur.variety) reach('variety', varietyWeeks + 1, todayN)
  const activeToday = active.has(todayN)
  const pausedToday = paused.has(todayN)

  return {
    daily: { count: daily, best: dailyBest, activeToday, pausedToday, atRisk: daily > 0 && !activeToday && !pausedToday, shields, shieldDays },
    weekly: { count: weeklyCount, best: Math.max(weeklyBest, weeklyCount), thisWeek: { active: cur.act, goal: cur.goal, done: weekDone } },
    progress,
    unlocked,
  }
}

/** Reached tier count, the next target and the share of the way there. */
export function achievementLevel(id: AchievementId | SocialAchievementId, value: number): { level: number; next?: number; ratio: number } {
  const tiers: readonly number[] = [...ACHIEVEMENTS, ...SOCIAL_ACHIEVEMENTS].find((a) => a.id === id)!.tiers
  const level = tiers.filter((t) => value >= t).length
  const next = tiers[level]
  const prev = level ? tiers[level - 1] : 0
  return { level, next, ratio: next === undefined ? 1 : (value - prev) / (next - prev) }
}
