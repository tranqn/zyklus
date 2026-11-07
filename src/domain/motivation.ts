import { activityLog, computeFlames, pausedDays as sharedPausedDays, type Flames, type WeeklyGoal } from '../../server/src/shared/flames'
import type { Profile, Settings, WorkoutSession } from './types'
import { today } from './util'

export { ACHIEVEMENTS, achievementLevel, activityLog, isActive, MAX_SHIELDS, MIN_MINUTES, SOCIAL_ACHIEVEMENTS, type AchievementId, type Flames, type SocialAchievementId } from '../../server/src/shared/flames'

export interface FlameSources {
  sessions: WorkoutSession[]
  cardio: { date: string; minutes: number }[]
  mobility: { date: string; minutes: number }[]
  frozenDays: string[]
  settings: Pick<Settings, 'mode' | 'modeSince' | 'weeklyGoals'>
  profile?: Pick<Profile, 'daysPerWeek'> | null
}

/** Weekly goal in active days when none is set: the training days of the plan. */
export function defaultWeeklyGoal(profile?: Pick<Profile, 'daysPerWeek'> | null): number {
  return Math.min(7, Math.max(1, profile?.daysPerWeek ?? 3))
}

/** Vacation and sick days, including a mode that is still running. */
export function pausedDays(s: Pick<FlameSources, 'frozenDays' | 'settings'>, d = today()): string[] {
  return sharedPausedDays(s.frozenDays, s.settings.mode, s.settings.modeSince, d)
}

export function flamesOf(s: FlameSources, d = today()): Flames {
  return computeFlames(activityLog(s), { today: d, paused: pausedDays(s, d), goals: s.settings.weeklyGoals, defaultGoal: defaultWeeklyGoal(s.profile) })
}

/**
 * Goal history after changing the goal to `days` this week. Earlier weeks keep the goal they had,
 * so a change never turns old weeks into failures.
 */
export function withWeeklyGoal(goals: WeeklyGoal[] | undefined, current: number, days: number, monday: string): WeeklyGoal[] {
  const history = goals?.length ? goals : [{ from: '2000-01-03', days: current }]
  return [...history.filter((g) => g.from < monday), { from: monday, days }]
}
