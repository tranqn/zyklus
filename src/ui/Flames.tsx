import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ACHIEVEMENTS, achievementLevel, MIN_MINUTES, type AchievementId, type Flames } from '../domain/motivation'
import { startOfWeek, today } from '../domain/util'
import { useStore } from '../store'
import { useT } from '../i18n'
import { Icon, Sheet } from './kit'
import { useFlames } from './useFlames'
import { useSync } from '../sync/engine'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/** Minutes of cardio and mobility still missing today (a strength session lights the flame at once). */
function minutesLeft(s: { cardio: { date: string; minutes: number }[]; mobility: { date: string; minutes: number }[] }): number {
  const d = today()
  const done = [...s.cardio, ...s.mobility].filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0)
  return Math.max(1, MIN_MINUTES - done)
}

/** One line about today's flame: lit, at risk, paused or not started. */
export function FlameStatus({ f }: { f: Flames }) {
  const s = useStore()
  const { t } = useT()
  const text = f.daily.activeToday ? t('motivation.activeToday') : f.daily.pausedToday ? t('motivation.pausedToday') : f.daily.atRisk ? t('motivation.atRisk', { min: minutesLeft(s) }) : t('motivation.start')
  return <p className="text-[0.85rem] text-muted-foreground">{text}</p>
}

const SEEN_KEY = 'zyklus-flame-seen'
interface Seen {
  /** day the daily flame was last celebrated */
  day: string
  /** Monday of the week whose goal was last celebrated */
  week: string
  levels: Partial<Record<AchievementId, number>>
}
function readSeen(): Seen | null {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null') as Seen | null
  } catch {
    return null
  }
}
function writeSeen(v: Seen) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(v))
  } catch {
    // private mode: the celebration may show again, nothing else breaks
  }
}

const levelsOf = (f: Flames) => Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, achievementLevel(a.id, f.progress[a.id]).level])) as Record<AchievementId, number>
const MILESTONES = new Set([1, ...ACHIEVEMENTS[0].tiers])

function seenNow(f: Flames): Seen {
  return { day: f.daily.activeToday ? today() : '', week: f.weekly.thisWeek.done ? startOfWeek(today()) : '', levels: levelsOf(f) }
}

/** What is new since the last celebration on this device: today's flame, this week's goal, achievement levels. */
function pendingCelebration(f: Flames): { key: string; daily: boolean; week: boolean; unlocked: { id: AchievementId; level: number }[] } | null {
  const seen = readSeen()
  if (!seen) return null
  const d = today()
  const monday = startOfWeek(d)
  const levels = levelsOf(f)
  const daily = f.daily.activeToday && seen.day !== d
  const week = f.weekly.thisWeek.done && seen.week !== monday
  const unlocked = ACHIEVEMENTS.filter((a) => levels[a.id] > (seen.levels[a.id] ?? 0)).map((a) => ({ id: a.id, level: levels[a.id] }))
  if (!daily && !week && !unlocked.length) return null
  return { key: `${daily ? d : ''}|${week ? monday : ''}|${unlocked.map((u) => u.id + u.level).join()}`, daily, week, unlocked }
}

/**
 * Celebrates the first activity of the day (and a reached weekly goal or a new achievement level) once per device.
 * Mounted in the app shell, so it shows wherever the activity was logged, but never in the middle of a workout.
 */
export function FlameCelebration() {
  const f = useFlames()
  const { t, tk } = useT()
  const { pathname } = useLocation()
  // the last celebration closed in this session; reading localStorage again would only repeat it
  const [closed, setClosed] = useState('')
  const pending = pathname === '/training' ? null : pendingCelebration(f)
  const shown = pending && pending.key !== closed ? pending : null

  // first run on this device: remember the state after the first sync instead of celebrating the whole
  // history (a new device would otherwise celebrate everything the account ever reached)
  const synced = useSync((x) => !!x.lastSyncedAt)
  useEffect(() => {
    // without any activity yet there is nothing that could be celebrated twice
    if ((synced || f.progress.days === 0) && !readSeen()) writeSeen(seenNow(f))
  }, [f, synced])

  const close = () => {
    if (!shown) return
    const seen = readSeen()
    writeSeen({ ...seenNow(f), day: shown.daily || f.daily.activeToday ? today() : (seen?.day ?? ''), week: shown.week || f.weekly.thisWeek.done ? startOfWeek(today()) : (seen?.week ?? '') })
    setClosed(shown.key)
  }

  const milestone = shown?.daily && MILESTONES.has(f.daily.count)
  const heading = !shown ? '' : shown.daily ? t('motivation.celebrate.title') : shown.week ? t('motivation.weekDone') : t('motivation.achievements')
  return (
    <Sheet open={!!shown} onClose={close} label={heading}>
      {shown && (
        <div className="flex flex-col gap-2" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <span className={`celebrate-flame ${milestone ? 'big' : ''}`} aria-hidden="true">
            <Icon name={shown.daily ? 'flame' : shown.week ? 'calendar' : 'trophy'} size={milestone ? 96 : 72} stroke={1.6} />
          </span>
          {milestone && <Badge variant="accent">{t('motivation.celebrate.milestone')}</Badge>}
          {(shown.daily || shown.week) && (
            <div className="flame-n tabular-nums" style={{ fontSize: '3rem' }}>
              {shown.daily ? f.daily.count : f.weekly.count}
            </div>
          )}
          <h2 aria-hidden="true">{heading}</h2>
          {shown.daily && <p className="text-[0.85rem] text-muted-foreground">{t('motivation.days', { n: f.daily.count })}</p>}
          {!shown.daily && shown.week && <p className="text-[0.85rem] text-muted-foreground">{t('motivation.weeks', { n: f.weekly.count })}</p>}
          {shown.daily && shown.week && <p>{t('motivation.celebrate.week', { n: f.weekly.count })}</p>}
          {shown.unlocked.map((u) => (
            <p key={u.id} className="flex items-center gap-2" style={{ gap: 8 }}>
              <span className="medal on">{u.level}</span>
              {t('motivation.celebrate.unlocked', { name: tk(`motivation.a.${u.id}.name`), level: u.level })}
            </p>
          ))}
          {shown.daily && <p className="text-[0.85rem] text-muted-foreground">{t('motivation.celebrate.text')}</p>}
          <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={close}>
            {t('motivation.celebrate.ok')}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
