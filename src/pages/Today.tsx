import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { burnedToday, targets, totals } from '../domain/nutrition'
import { estimateMinutes, isDeload, targetRir } from '../domain/planner'
import { buildSession, cyclePosition } from '../domain/progression'
import type { CheckIn, Muscle } from '../domain/types'
import { addDays, currentHour, daysBetween, fmt, formatDate, isStaleSession, nowMs, startOfWeek, today, weekdayIndex } from '../domain/util'
import { exerciseMap, useStore } from '../store'
import { Bar, Icon, Ring, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { CheckInSheet } from './CheckInSheet'
import { VerifyBanner } from './Account'
import { useSync } from '../sync/engine'
import { useT, weekdaysShort } from '../i18n'
import { exerciseName } from '../i18n/content/exercises'
import { dayFocus, dayName, sessionDayName } from '../i18n/display'
import { FlameStatus } from '../ui/Flames'
import { useFlames } from '../ui/useFlames'
import { refreshSocialIfStale, useSocialCache } from '../sync/social'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Today() {
  const s = useStore()
  const nav = useNavigate()
  const user = useSync((x) => x.user)
  const { t } = useT()
  const [checkIn, setCheckIn] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)
  const profile = s.profile!
  const meso = s.meso!
  const lib = useMemo(() => exerciseMap(s), [s])
  const pos = cyclePosition(meso, s.sessions)
  const day = meso.days[pos.dayIndex]
  const deload = isDeload(pos.week, meso.weeks)
  const rir = targetRir(pos.week, meso.weeks, profile.level)
  const muscles = [...new Set(day.slots.map((sl) => lib.get(sl.exerciseId)?.primary).filter(Boolean))] as Muscle[]

  const d = today()
  const goal = targets(profile, s.settings.kcalOverride, s.kcalAdjustment)
  const eaten = totals(s.foods.filter((f) => f.date === d))
  const burned = burnedToday(s.cardio, d)
  const flames = useFlames()
  const { challenges } = useSocialCache()
  useEffect(refreshSocialIfStale, [])
  const challenge = challenges.find((c) => c.status === 'running' && c.end >= d)
  const isTrainingDay = profile.trainingDays.includes(weekdayIndex(d))
  const [now] = useState(() => nowMs())
  const lastWeight = s.weights[s.weights.length - 1]
  const hour = currentHour()
  const hello = hour < 11 ? t('today.morning') : hour < 18 ? t('today.hello') : t('today.evening')

  const start = (c: CheckIn | undefined) => {
    if (c) s.saveCheckIn(c)
    const session = buildSession({
      meso,
      day,
      week: pos.week,
      level: profile.level,
      library: lib,
      history: s.sessions,
      checkIn: c,
      warmupSets: s.settings.warmupSets,
      reentry: s.settings.reentryPending,
    })
    if (s.settings.reentryPending) s.updateSettings({ reentryPending: false })
    s.startSession(session)
    setCheckIn(false)
    nav('/training')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>
            {hello}
            {profile.name ? `, ${profile.name}` : ''}
          </h1>
        </div>
        <Link to="/erfolge" className="flex items-center gap-2" style={{ gap: 6, textDecoration: 'none' }}>
          <span className={`flame-chip ${flames.daily.activeToday ? 'lit' : ''}`} aria-label={t('motivation.dailyChip', { n: flames.daily.count })}>
            <Icon name="flame" size={16} /> {flames.daily.count}
          </span>
          <span className={`flame-chip ${flames.weekly.thisWeek.done ? 'lit' : ''}`} aria-label={t('motivation.weeklyChip', { n: flames.weekly.count })}>
            <Icon name="calendar" size={15} /> {flames.weekly.count}
          </span>
        </Link>
      </div>
      {!flames.daily.activeToday && !flames.daily.pausedToday && <FlameStatus f={flames} />}

      {user && !user.verified && <VerifyBanner />}

      {s.settings.mode !== 'normal' && (
        <Card style={{ background: 'var(--warn-soft)', borderColor: 'transparent' }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <strong>{s.settings.mode === 'urlaub' ? t('today.vacationOn') : t('today.sickOn')}</strong>
              <p className="text-[0.85rem] text-muted-foreground">{t('today.paused')}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => s.setMode('normal')}>
              {t('today.end')}
            </Button>
          </div>
        </Card>
      )}

      {s.active ? (
        <Link to="/training" className="glass-card rounded-[var(--radius)] p-4 text-card-foreground [--glass-fill:var(--accent-grad)] text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/80 flex flex-col gap-2" style={{ textDecoration: 'none' }}>
          <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
            {t('today.running')}
          </div>
          <h2>{sessionDayName(s.active)}</h2>
          {isStaleSession(s.active.startedAt, now) && <p className="text-[0.85rem]">{t('today.staleRunning', { date: formatDate(s.active.date, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>}
          <span className={buttonVariants({ variant: 'secondary' })} style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0, alignSelf: 'flex-start' }}>
            {t('today.resume')}
          </span>
        </Link>
      ) : meso.completed ? (
        <Card className="[--glass-fill:var(--accent-grad)] text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/80 flex flex-col gap-2">
          <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
            {t('today.mesoDone', { n: meso.number })}
          </div>
          <h2>{t('today.reviewTitle')}</h2>
          <p className="text-[0.85rem] text-muted-foreground">{t('today.reviewText')}</p>
          <Link to="/zyklus" className={buttonVariants({ variant: 'secondary' })} style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0, alignSelf: 'flex-start' }}>
            {t('today.toReview')}
          </Link>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">
              {t('today.position', { week: pos.week + 1, weeks: meso.weeks, day: pos.dayIndex + 1, days: meso.days.length })}
            </span>
            {deload ? <Badge variant="warn">{t('common.deload')}</Badge> : <Badge>{rir} RIR</Badge>}
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>{dayName(day)}</h2>
          <p className="text-muted-foreground text-[0.85rem]">{t('today.dayMeta', { n: day.slots.length, min: estimateMinutes(day), focus: dayFocus(day) })}</p>
          <div className="flex flex-col gap-2" style={{ gap: 4 }}>
            {day.slots.slice(0, 4).map((sl) => (
              <div key={sl.key} className="flex items-center gap-2 text-[0.85rem]">
                <span className="text-muted-foreground tabular-nums" style={{ width: 28 }}>
                  {sl.sets}×
                </span>
                <span>{lib.get(sl.exerciseId) && exerciseName(lib.get(sl.exerciseId)!)}</span>
              </div>
            ))}
            {day.slots.length > 4 && <span className="text-muted-foreground text-[0.85rem]">{t('today.more', { n: day.slots.length - 4 })}</span>}
          </div>
          {!isTrainingDay && <p className="text-[0.85rem] text-muted-foreground">{t('today.restDay')}</p>}
          <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => setCheckIn(true)} disabled={s.settings.mode !== 'normal'}>
            <Icon name="play" size={18} /> {t('today.start')}
          </Button>
        </Card>
      )}

      <WeekCard />

      {challenge && (
        <Link to="/freunde" state={{ tab: 'challenges' }} className="glass-card rounded-[var(--radius)] p-4 text-card-foreground flex flex-col gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">{challenge.kind === 'goal' ? t('social.ch.goal') : t('social.ch.streak')}</span>
            <Badge>{t('social.ch.left', { n: daysBetween(d, challenge.end) + 1 })}</Badge>
          </div>
          <h3>{challenge.title || (challenge.kind === 'goal' ? t('social.ch.defaultGoal', { target: fmt(challenge.target ?? 0), unit: challenge.metric === 'minutes' ? t('social.ch.unitMinutes') : t('social.ch.unitDays') }) : t('social.ch.defaultStreak', { n: challenge.days }))}</h3>
          {challenge.kind === 'goal' ? (
            <Bar value={Math.min(challenge.total, challenge.target ?? 0)} max={challenge.target ?? 1} color="var(--accent)" />
          ) : (
            <span className="text-[0.85rem] text-muted-foreground">
              {t('social.ch.members')}: {challenge.members.filter((m) => m.status !== 'out').length}/{challenge.members.length}
            </span>
          )}
        </Link>
      )}

      <Link to="/ernaehrung" className="glass-card rounded-[var(--radius)] p-4 text-card-foreground flex items-center gap-2" style={{ gap: 16, textDecoration: 'none', color: 'inherit' }}>
        <Ring value={eaten.kcal} max={goal.kcal + burned} size={104} stroke={10}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }} className="tabular-nums">
              {fmt(Math.max(0, Math.round(goal.kcal + burned - eaten.kcal)))}
            </div>
            <div className="text-xs text-muted-foreground">{t('common.kcalLeft')}</div>
          </div>
        </Ring>
        <div className="flex flex-col gap-2 min-w-0 flex-1" style={{ gap: 10 }}>
          <Macro label={t('common.protein')} v={eaten.protein} max={goal.protein} color="var(--protein)" />
          <Macro label={t('common.carbs')} v={eaten.carbs} max={goal.carbs} color="var(--carbs)" />
          <Macro label={t('common.fat')} v={eaten.fat} max={goal.fat} color="var(--fat)" />
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-2">
        <button className="glass-card rounded-[var(--radius)] p-4 text-card-foreground p-3 flex flex-col gap-2" style={{ alignItems: 'center', gap: 6 }} onClick={() => setWeightOpen(true)}>
          <Icon name="scale" />
          <span className="text-[0.85rem]" style={{ fontWeight: 600 }}>
            {lastWeight ? `${fmt(lastWeight.kg, 1)} kg` : t('common.weight')}
          </span>
        </button>
        <Link to="/mobility" className="glass-card rounded-[var(--radius)] p-4 text-card-foreground p-3 flex flex-col gap-2" style={{ alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
          <Icon name="stretch" />
          <span className="text-[0.85rem]" style={{ fontWeight: 600 }}>
            {t('common.mobility')}
          </span>
        </Link>
        <Link to="/cardio" className="glass-card rounded-[var(--radius)] p-4 text-card-foreground p-3 flex flex-col gap-2" style={{ alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
          <Icon name="run" />
          <span className="text-[0.85rem]" style={{ fontWeight: 600 }}>
            {t('common.cardio')}
          </span>
        </Link>
      </div>

      <CheckInSheet open={checkIn} muscles={muscles} onClose={() => setCheckIn(false)} onDone={start} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
    </div>
  )
}

/** This week at a glance; "Tage ändern" turns the days into toggles for the training days. */
function WeekCard() {
  const s = useStore()
  const { t, lang } = useT()
  const profile = s.profile!
  const [draft, setDraft] = useState<number[] | null>(null)
  const d = today()
  const weekStart = startOfWeek(d)
  const doneDates = new Set(s.sessions.filter((x) => x.finishedAt).map((x) => x.date))
  const names = weekdaysShort(lang)

  const toggle = (i: number) => setDraft((cur) => {
    const days = cur ?? profile.trainingDays
    return days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort((a, b) => a - b)
  })
  const save = () => {
    if (!draft) return
    if (draft.length < 2 || draft.length > 6) return toast(t('today.daysRange'))
    if (draft.join() === profile.trainingDays.join()) return setDraft(null)
    if (draft.length === profile.daysPerWeek) {
      s.updateProfile({ trainingDays: draft })
    } else {
      // a different number of days needs a different split
      if (!confirmAction(t('today.daysRegen', { n: draft.length }))) return
      s.updateProfile({ trainingDays: draft, daysPerWeek: draft.length }, true)
    }
    setDraft(null)
    toast(t('today.daysSaved'))
  }

  return (
    <Card className="flex flex-col gap-2">
      {/* same height in both modes (Fertig button is 36px), so the card does not jump when editing starts */}
      <div className="flex items-center justify-between gap-2" style={{ minHeight: 36 }}>
        <h3>{t('today.thisWeek')}</h3>
        {draft ? (
          <Button size="sm" onClick={save}>
            {t('today.editDone')}
          </Button>
        ) : (
          <div className="flex items-center gap-2" style={{ gap: 4 }}>
            <Link to="/fortschritt" className="text-[0.85rem]">
              {t('today.calendar')}
            </Link>
            {/* negative margin fits the 44px tap target into the 36px head */}
            <Button variant="ghost" size="icon" style={{ margin: '-4px -10px -4px 0' }} aria-label={t('today.editDays')} title={t('today.editDays')} onClick={() => setDraft(profile.trainingDays)}>
              <Icon name="settings" size={20} />
            </Button>
          </div>
        )}
      </div>
      <div className="week-strip">
        {names.map((w, i) => {
          const date = addDays(weekStart, i)
          if (draft) {
            const on = draft.includes(i)
            return (
              <div key={w} className="day-dot">
                {w}
                <button className={`d ${on ? 'on' : ''} ${date === d ? 'today' : ''}`} aria-pressed={on} aria-label={t('today.dayToggle', { day: w })} onClick={() => toggle(i)}>
                  {Number(date.slice(8))}
                </button>
              </div>
            )
          }
          const cls = ['d', doneDates.has(date) ? 'done' : profile.trainingDays.includes(i) ? 'plan' : '', date === d ? 'today' : ''].join(' ')
          return (
            <div key={w} className="day-dot">
              {w}
              <span className={cls}>{Number(date.slice(8))}</span>
            </div>
          )
        })}
      </div>
      {/* always rendered so its line is reserved; only visible while editing */}
      <p className="text-[0.85rem] text-muted-foreground" aria-hidden={!draft} style={{ visibility: draft ? 'visible' : 'hidden' }}>
        {t('today.editHint')}
      </p>
    </Card>
  )
}

function Macro({ label, v, max, color }: { label: string; v: number; max: number; color: string }) {
  return (
    <div className="flex flex-col gap-2" style={{ gap: 4 }}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {Math.round(v)} / {max} g
        </span>
      </div>
      <Bar value={v} max={max} color={color} />
    </div>
  )
}

export function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const weights = useStore((s) => s.weights)
  const logWeight = useStore((s) => s.logWeight)
  const last = weights[weights.length - 1]?.kg ?? 75
  const [kg, setKg] = useState(last)
  const { t } = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t('today.weightSheet.title')}>
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-[0.85rem]">{t('today.weightSheet.hint')}</p>
        <Stepper label={t('common.weight')} value={kg} onChange={setKg} step={0.1} min={30} max={300} suffix="kg" />
        <Button
          className="w-full whitespace-normal text-center leading-tight py-2.5"
          onClick={() => {
            logWeight(kg)
            toast(t('today.weightSheet.saved'))
            onClose()
          }}
        >
          {t('common.save')}
        </Button>
      </div>
    </Sheet>
  )
}
