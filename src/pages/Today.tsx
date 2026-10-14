import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { burnedToday, targets, totals } from '../domain/nutrition'
import { estimateMinutes, isDeload, targetRir } from '../domain/planner'
import { buildSession, cyclePosition } from '../domain/progression'
import { streak } from '../domain/stats'
import type { CheckIn, Muscle } from '../domain/types'
import { addDays, currentHour, formatDate, startOfWeek, today, WEEKDAYS_SHORT, weekdayIndex } from '../domain/util'
import { exerciseMap, useStore } from '../store'
import { Bar, Icon, Ring, Sheet, Stepper } from '../ui/kit'
import { toast } from '../ui/notify'
import { CheckInSheet } from './CheckInSheet'
import { VerifyBanner } from './Account'
import { useSync } from '../sync/engine'

export default function Today() {
  const s = useStore()
  const nav = useNavigate()
  const user = useSync((x) => x.user)
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
  const t = targets(profile, s.settings.kcalOverride, s.kcalAdjustment)
  const eaten = totals(s.foods.filter((f) => f.date === d))
  const burned = burnedToday(s.cardio, d)
  const streakN = streak(s)
  const isTrainingDay = profile.trainingDays.includes(weekdayIndex(d))
  const weekStart = startOfWeek(d)
  const doneDates = new Set(s.sessions.filter((x) => x.finishedAt).map((x) => x.date))
  const lastWeight = s.weights[s.weights.length - 1]
  const hour = currentHour()
  const hello = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend'

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
        <div className="badge accent" style={{ fontSize: '0.9rem', padding: '6px 12px', gap: 4 }} title="Tage in Folge mit Aktivität">
          <Icon name="flame" size={16} /> {streakN}
        </div>
      </div>

      {user && !user.verified && <VerifyBanner />}

      {s.settings.mode !== 'normal' && (
        <div className="card" style={{ background: 'var(--warn-soft)', borderColor: 'transparent' }}>
          <div className="row between">
            <div>
              <strong>{s.settings.mode === 'urlaub' ? 'Urlaubsmodus aktiv' : 'Krankheitsmodus aktiv'}</strong>
              <p className="small muted">Dein Plan und deine Serie sind pausiert.</p>
            </div>
            <button className="btn sm" onClick={() => s.setMode('normal')}>
              Beenden
            </button>
          </div>
        </div>
      )}

      {s.active ? (
        <Link to="/training" className="card accent stack" style={{ textDecoration: 'none' }}>
          <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
            Läuft gerade
          </div>
          <h2>{s.active.dayName}</h2>
          <span className="btn" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0, alignSelf: 'flex-start' }}>
            Training fortsetzen
          </span>
        </Link>
      ) : meso.completed ? (
        <div className="card accent stack">
          <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
            Mesozyklus {meso.number} geschafft
          </div>
          <h2>Zeit für deine Auswertung</h2>
          <p className="small muted">Sieh dir deinen Fortschritt an und starte den nächsten Zyklus.</p>
          <Link to="/zyklus" className="btn" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0, alignSelf: 'flex-start' }}>
            Zur Auswertung
          </Link>
        </div>
      ) : (
        <div className="card stack">
          <div className="row between">
            <span className="eyebrow">
              Woche {pos.week + 1}/{meso.weeks} · Einheit {pos.dayIndex + 1}/{meso.days.length}
            </span>
            {deload ? <span className="badge warn">Deload</span> : <span className="badge">{rir} RIR</span>}
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>{day.name}</h2>
          <p className="muted small">
            {day.slots.length} Übungen · ca. {estimateMinutes(day)} min · {day.focus}
          </p>
          <div className="stack" style={{ gap: 4 }}>
            {day.slots.slice(0, 4).map((sl) => (
              <div key={sl.key} className="row small">
                <span className="muted num" style={{ width: 28 }}>
                  {sl.sets}×
                </span>
                <span>{lib.get(sl.exerciseId)?.name}</span>
              </div>
            ))}
            {day.slots.length > 4 && <span className="muted small">+ {day.slots.length - 4} weitere</span>}
          </div>
          {!isTrainingDay && <p className="small muted">Heute ist laut Plan Ruhetag. Du kannst trotzdem trainieren.</p>}
          <button className="btn primary block" onClick={() => setCheckIn(true)} disabled={s.settings.mode !== 'normal'}>
            <Icon name="play" size={18} /> Training starten
          </button>
        </div>
      )}

      <div className="card stack">
        <div className="row between">
          <h3>Diese Woche</h3>
          <Link to="/fortschritt" className="small">
            Kalender
          </Link>
        </div>
        <div className="week-strip">
          {WEEKDAYS_SHORT.map((w, i) => {
            const date = addDays(weekStart, i)
            const cls = ['d', doneDates.has(date) ? 'done' : profile.trainingDays.includes(i) ? 'plan' : '', date === d ? 'today' : ''].join(' ')
            return (
              <div key={w} className="day-dot">
                {w}
                <span className={cls}>{Number(date.slice(8))}</span>
              </div>
            )
          })}
        </div>
      </div>

      <Link to="/ernaehrung" className="card row" style={{ gap: 16, textDecoration: 'none', color: 'inherit' }}>
        <Ring value={eaten.kcal} max={t.kcal + burned} size={104} stroke={10}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }} className="num">
              {Math.max(0, Math.round(t.kcal + burned - eaten.kcal)).toLocaleString('de-DE')}
            </div>
            <div className="tiny muted">kcal übrig</div>
          </div>
        </Ring>
        <div className="stack grow" style={{ gap: 10 }}>
          <Macro label="Protein" v={eaten.protein} max={t.protein} color="var(--protein)" />
          <Macro label="Kohlenhydrate" v={eaten.carbs} max={t.carbs} color="var(--carbs)" />
          <Macro label="Fett" v={eaten.fat} max={t.fat} color="var(--fat)" />
        </div>
      </Link>

      <div className="grid3">
        <button className="card tight stack" style={{ alignItems: 'center', gap: 6 }} onClick={() => setWeightOpen(true)}>
          <Icon name="scale" />
          <span className="small" style={{ fontWeight: 600 }}>
            {lastWeight ? `${lastWeight.kg.toLocaleString('de-DE')} kg` : 'Gewicht'}
          </span>
        </button>
        <Link to="/mobility" className="card tight stack" style={{ alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
          <Icon name="stretch" />
          <span className="small" style={{ fontWeight: 600 }}>
            Mobility
          </span>
        </Link>
        <Link to="/cardio" className="card tight stack" style={{ alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
          <Icon name="run" />
          <span className="small" style={{ fontWeight: 600 }}>
            Cardio
          </span>
        </Link>
      </div>

      <CheckInSheet open={checkIn} muscles={muscles} onClose={() => setCheckIn(false)} onDone={start} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
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
  return (
    <Sheet open={open} onClose={onClose} title="Gewicht eintragen">
      <div className="stack lg">
        <p className="muted small">Am besten morgens nüchtern nach dem Toilettengang. Der Trend glättet Tagesschwankungen.</p>
        <Stepper label="Gewicht" value={kg} onChange={setKg} step={0.1} min={30} max={300} suffix="kg" />
        <button
          className="btn primary block"
          onClick={() => {
            logWeight(kg)
            toast('Gewicht gespeichert')
            onClose()
          }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}
