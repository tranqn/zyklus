import { describe, expect, it } from 'vitest'
import { achievementLevel, activityLog, computeFlames, goalFor, type ActivityLog } from '../../../server/src/shared/flames'
import { flamesOf, pausedDays, withWeeklyGoal } from '../motivation'
import { addDays } from '../util'

// 2026-01-05 is a Monday
const MON = '2026-01-05'
const day = (i: number) => addDays(MON, i)
const cardio = (...days: number[]) => days.map((i) => ({ date: day(i), minutes: 20 }))
const log = (...days: number[]): ActivityLog => activityLog({ cardio: cardio(...days) })
const flames = (l: ActivityLog, today: number, more: { paused?: string[]; goal?: number } = {}) => computeFlames(l, { today: day(today), paused: more.paused, defaultGoal: more.goal ?? 3 })

describe('activity log', () => {
  it('counts a strength session with a done set, cardio and mobility from 10 minutes together', () => {
    const l = activityLog({
      sessions: [
        { date: day(0), startedAt: `${day(0)}T10:00:00Z`, finishedAt: `${day(0)}T11:00:00Z`, exercises: [{ sets: [{ done: true }] }] },
        // finished without a single done set: no activity
        { date: day(1), startedAt: `${day(1)}T10:00:00Z`, finishedAt: `${day(1)}T10:05:00Z`, exercises: [{ sets: [{ done: false }] }] },
      ],
      cardio: [{ date: day(2), minutes: 6 }, { date: day(3), minutes: 9 }],
      mobility: [{ date: day(2), minutes: 5 }],
    })
    expect(l[day(0)]).toEqual({ minutes: 60, strength: 1, cardio: 0, mobility: 0 })
    expect(l[day(1)]).toBeUndefined()
    const f = flames(l, 3)
    // day 1 is covered by the start shield, day 2 (6 + 5 minutes) counts, day 3 (9 minutes) is still open
    expect(f.daily.count).toBe(2)
    expect(f.daily.atRisk).toBe(true)
  })
})

describe('daily flame', () => {
  it('keeps burning while today is still open', () => {
    const f = flames(log(0, 1, 2), 3)
    expect(f.daily).toMatchObject({ count: 3, activeToday: false, atRisk: true })
    expect(flames(log(0, 1, 2, 3), 3).daily).toMatchObject({ count: 4, activeToday: true, atRisk: false })
  })

  it('pauses on vacation days without counting them', () => {
    const f = flames(log(0, 1, 4), 4, { paused: [day(2), day(3)] })
    expect(f.daily.count).toBe(3)
    expect(f.daily.shieldDays).toEqual([])
  })

  it('spends the start shield on one missed day, then breaks', () => {
    const one = flames(log(0, 1, 3), 3)
    expect(one.daily).toMatchObject({ count: 3, shields: 0, shieldDays: [day(2)] })
    const two = flames(log(0, 1, 4), 4)
    expect(two.daily.count).toBe(1)
  })

  it('earns a shield per reached weekly goal, at most two', () => {
    // three full weeks, every day active
    const l = log(...Array.from({ length: 21 }, (_, i) => i))
    const f = flames(l, 21)
    expect(f.weekly.count).toBe(3)
    expect(f.daily.shields).toBe(2)
  })
})

describe('weekly flame', () => {
  it('counts weeks that reach the goal and keeps the running week open', () => {
    const l = log(0, 2, 4, 7, 9, 11, 14)
    const f = flames(l, 15)
    expect(f.weekly.count).toBe(2)
    expect(f.weekly.thisWeek).toEqual({ active: 1, goal: 3, done: false })
    expect(flames(log(0, 2, 4, 7, 9, 11, 14, 15, 16), 16).weekly).toMatchObject({ count: 3, thisWeek: { done: true } })
  })

  it('breaks after a week below the goal; a paused week is neutral', () => {
    expect(flames(log(0, 2, 4, 7, 14, 16, 18), 21).weekly.count).toBe(1)
    const paused = [7, 8, 9, 10].map(day)
    expect(flames(log(0, 2, 4, 14, 16, 18), 21, { paused }).weekly.count).toBe(2)
  })

  it('keeps the goal history so a new goal does not judge old weeks', () => {
    const goals = withWeeklyGoal(undefined, 2, 4, day(7))
    expect(goalFor(goals, day(0), 9)).toBe(2)
    expect(goalFor(goals, day(7), 9)).toBe(4)
    const f = computeFlames(log(0, 2, 7, 9, 11, 12), { today: day(14), goals, defaultGoal: 9 })
    expect(f.weekly.count).toBe(2)
  })
})

describe('achievements', () => {
  it('records the day each tier was reached', () => {
    const f = flames(log(0, 1, 2, 3, 4, 5, 6), 6, { goal: 7 })
    expect(f.unlocked.daily).toEqual([day(2), day(6)])
    expect(achievementLevel('daily', f.progress.daily)).toEqual({ level: 2, next: 14, ratio: 0 })
  })

  it('counts a comeback after at least a week without activity', () => {
    const f = flames(log(0, 1, 12), 12)
    expect(f.progress.comeback).toBe(1)
  })

  it('counts weeks with strength, cardio and mobility as variety', () => {
    const l = activityLog({
      sessions: [{ date: day(0), startedAt: `${day(0)}T10:00:00Z`, finishedAt: `${day(0)}T10:40:00Z`, exercises: [{ sets: [{ done: true }] }] }],
      cardio: [{ date: day(1), minutes: 30 }],
      mobility: [{ date: day(2), minutes: 12 }],
    })
    expect(flames(l, 3).progress.variety).toBe(1)
  })
})

describe('app state', () => {
  it('treats a running vacation as paused and ignores food logs', () => {
    const settings = { mode: 'urlaub' as const, modeSince: day(2) }
    expect(pausedDays({ frozenDays: [day(0)], settings }, day(3))).toEqual([day(0), day(2), day(3)])
    const f = flamesOf({ sessions: [], cardio: cardio(0, 1), mobility: [], frozenDays: [], settings, profile: { daysPerWeek: 3 } }, day(4))
    expect(f.daily.count).toBe(2)
  })
})
