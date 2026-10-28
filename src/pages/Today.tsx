import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { burnedToday, targets, totals } from '../domain/nutrition'
import { estimateMinutes, isDeload, targetRir } from '../domain/planner'
import { buildSession, cyclePosition } from '../domain/progression'
import { streak } from '../domain/stats'
import type { CheckIn, Muscle } from '../domain/types'
import { addDays, currentHour, fmt, formatDate, isStaleSession, nowMs, startOfWeek, today, weekdayIndex } from '../domain/util'
import { exerciseMap, useStore } from '../store'
import { Bar, Icon, Ring, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { CheckInSheet } from './CheckInSheet'
import { VerifyBanner } from './Account'
import { useSync } from '../sync/engine'
import { useT, weekdaysShort } from '../i18n'
import { exerciseName } from '../i18n/content/exercises'
import { dayFocus, dayName, sessionDayName } from '../i18n/display'

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
  const streakN = streak(s)
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
        <div className="badge accent" style={{ fontSize: '0.9rem', padding: '6px 12px', gap: 4 }} title={t('today.streakTitle')}>
          <Icon name="flame" size={16} /> {streakN}
        </div>
      </div>

      {user && !user.verified && <VerifyBanner />}

      {s.settings.mode !== 'normal' && (
        <div className="card" style={{ background: 'var(--warn-soft)', borderColor: 'transparent' }}>
          <div className="row between">
            <div>
              <strong>{s.settings.mode === 'urlaub' ? t('today.vacationOn') : t('today.sickOn')}</strong>
              <p className="small muted">{t('today.paused')}</p>
            </div>
            <button className="btn sm" onClick={() => s.setMode('normal')}>
              {t('today.end')}
            </button>
          </div>
        </div>
      )}

      {s.active ? (
        <Link to="/training" className="card accent stack" style={{ textDecoration: 'none' }}>
          <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
            {t('today.running')}
          </div>
          <h2>{sessionDayName(s.active)}</h2>
          {isStaleSession(s.active.startedAt, now) && <p className="small">{t('today.staleRunning', { date: formatDate(s.active.date, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>}
          <span className="btn" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0, alignSelf: 'flex-start' }}>
            {t('today.resume')}
          </span>
        </Link>
      ) : meso.completed ? (
        <div className="card accent stack">
          <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
            {t('today.mesoDone', { n: meso.number })}
          </div>
          <h2>{t('today.reviewTitle')}</h2>
          <p className="small muted">{t('today.reviewText')}</p>
          <Link to="/zyklus" className="btn" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0, alignSelf: 'flex-start' }}>
            {t('today.toReview')}
          </Link>
        </div>
      ) : (
        <div className="card stack">
          <div className="row between">
            <span className="eyebrow">
              {t('today.position', { week: pos.week + 1, weeks: meso.weeks, day: pos.dayIndex + 1, days: meso.days.length })}
            </span>
            {deload ? <span className="badge warn">{t('common.deload')}</span> : <span className="badge">{rir} RIR</span>}
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>{dayName(day)}</h2>
          <p className="muted small">{t('today.dayMeta', { n: day.slots.length, min: estimateMinutes(day), focus: dayFocus(day) })}</p>
          <div className="stack" style={{ gap: 4 }}>
            {day.slots.slice(0, 4).map((sl) => (
              <div key={sl.key} className="row small">
                <span className="muted num" style={{ width: 28 }}>
                  {sl.sets}×
                </span>
                <span>{lib.get(sl.exerciseId) && exerciseName(lib.get(sl.exerciseId)!)}</span>
              </div>
            ))}
            {day.slots.length > 4 && <span className="muted small">{t('today.more', { n: day.slots.length - 4 })}</span>}
          </div>
          {!isTrainingDay && <p className="small muted">{t('today.restDay')}</p>}
          <button className="btn primary block" onClick={() => setCheckIn(true)} disabled={s.settings.mode !== 'normal'}>
            <Icon name="play" size={18} /> {t('today.start')}
          </button>
        </div>
      )}

      <WeekCard />

      <Link to="/ernaehrung" className="card row" style={{ gap: 16, textDecoration: 'none', color: 'inherit' }}>
        <Ring value={eaten.kcal} max={goal.kcal + burned} size={104} stroke={10}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }} className="num">
              {fmt(Math.max(0, Math.round(goal.kcal + burned - eaten.kcal)))}
            </div>
            <div className="tiny muted">{t('common.kcalLeft')}</div>
          </div>
        </Ring>
        <div className="stack grow" style={{ gap: 10 }}>
          <Macro label={t('common.protein')} v={eaten.protein} max={goal.protein} color="var(--protein)" />
          <Macro label={t('common.carbs')} v={eaten.carbs} max={goal.carbs} color="var(--carbs)" />
          <Macro label={t('common.fat')} v={eaten.fat} max={goal.fat} color="var(--fat)" />
        </div>
      </Link>

      <div className="grid3">
        <button className="card tight stack" style={{ alignItems: 'center', gap: 6 }} onClick={() => setWeightOpen(true)}>
          <Icon name="scale" />
          <span className="small" style={{ fontWeight: 600 }}>
            {lastWeight ? `${fmt(lastWeight.kg, 1)} kg` : t('common.weight')}
          </span>
        </button>
        <Link to="/mobility" className="card tight stack" style={{ alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
          <Icon name="stretch" />
          <span className="small" style={{ fontWeight: 600 }}>
            {t('common.mobility')}
          </span>
        </Link>
        <Link to="/cardio" className="card tight stack" style={{ alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
          <Icon name="run" />
          <span className="small" style={{ fontWeight: 600 }}>
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
    <div className="card stack">
      <div className="row between">
        <h3>{t('today.thisWeek')}</h3>
        {draft ? (
          <button className="btn primary sm" onClick={save}>
            {t('today.editDone')}
          </button>
        ) : (
          <div className="row" style={{ gap: 4 }}>
            <Link to="/fortschritt" className="small">
              {t('today.calendar')}
            </Link>
            {/* negative margin keeps the head as tall as the plain text row */}
            <button className="icon-btn plain" style={{ margin: '-10px -10px -10px 0' }} aria-label={t('today.editDays')} title={t('today.editDays')} onClick={() => setDraft(profile.trainingDays)}>
              <Icon name="settings" size={20} />
            </button>
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
      {draft && <p className="small muted">{t('today.editHint')}</p>}
    </div>
  )
}

function Macro({ label, v, max, color }: { label: string; v: number; max: number; color: string }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="row between tiny">
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="muted num">
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
      <div className="stack lg">
        <p className="muted small">{t('today.weightSheet.hint')}</p>
        <Stepper label={t('common.weight')} value={kg} onChange={setKg} step={0.1} min={30} max={300} suffix="kg" />
        <button
          className="btn primary block"
          onClick={() => {
            logWeight(kg)
            toast(t('today.weightSheet.saved'))
            onClose()
          }}
        >
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  )
}
