import { useMemo, useState } from 'react'
import { weightTrend } from '../domain/nutrition'
import { workSets } from '../domain/progression'
import { muscleContributions, muscleRecovery, personalRecords, sessionMinutes, sessionSets, sessionVolume, streak, weeklyMuscleSets, type MuscleRecovery } from '../domain/stats'
import type { MeasureSite, Muscle, WorkoutSession } from '../domain/types'
import { addDays, fmt, formatDate, parseDay, startOfWeek, today } from '../domain/util'
import { e1rmHistory, exerciseMap, useStore } from '../store'
import { BodyMap } from '../ui/BodyMap'
import { Bar, Icon, LineChart, Segmented, Sheet } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { getLocale } from '../i18n/lang'
import { t as tr, tk as tkr, useT, weekdaysShort } from '../i18n'
import { exerciseName } from '../i18n/content/exercises'
import { sessionDayName } from '../i18n/display'
import { WeightSheet } from './Today'

type Tab = 'uebersicht' | 'kraft' | 'koerper' | 'verlauf'

export default function Progress() {
  const [tab, setTab] = useState<Tab>('uebersicht')
  const { t } = useT()
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{t('progress.eyebrow')}</div>
          <h1>{t('progress.title')}</h1>
        </div>
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        label={t('progress.area')}
        options={[
          { value: 'uebersicht', label: t('progress.tab.uebersicht') },
          { value: 'kraft', label: t('progress.tab.kraft') },
          { value: 'koerper', label: t('progress.tab.koerper') },
          { value: 'verlauf', label: t('progress.tab.verlauf') },
        ]}
      />
      {tab === 'uebersicht' && <Overview />}
      {tab === 'kraft' && <Strength />}
      {tab === 'koerper' && <Body />}
      {tab === 'verlauf' && <History />}
    </div>
  )
}

function Overview() {
  const s = useStore()
  const done = s.sessions.filter((x) => x.finishedAt)
  const weekStart = startOfWeek(today())
  const thisWeek = done.filter((x) => x.date >= weekStart && x.date < addDays(weekStart, 7))
  const totalVolume = done.reduce((a, x) => a + sessionVolume(x), 0)
  return (
    <>
      <div className="grid2">
        <div className="card stat">
          <span className="v">{done.length}</span>
          <span className="l">{tr('progress.totalWorkouts')}</span>
        </div>
        <div className="card stat">
          <span className="v">{streak(s)}</span>
          <span className="l">{tr('progress.streakDays')}</span>
        </div>
        <div className="card stat">
          <span className="v">{thisWeek.length}</span>
          <span className="l">{tr('progress.weekWorkouts')}</span>
        </div>
        <div className="card stat">
          <span className="v">{fmt(totalVolume / 1000, 1)} t</span>
          <span className="l">{tr('progress.movedWeight')}</span>
        </div>
      </div>

      <Calendar />

      <MuscleCard />
    </>
  )
}

const MUSCLE_ORDER: Muscle[] = ['brust', 'ruecken', 'schultern', 'bizeps', 'trizeps', 'quadrizeps', 'beinbeuger', 'gesaess', 'waden', 'bauch', 'unterarme']
type MapMode = 'volumen' | 'erholung'

/** Sequential scale for weekly sets: 0 = empty, 20+ = full accent. */
const volumeFill = (v: number) => (v <= 0 ? 'var(--line)' : `color-mix(in srgb, var(--accent) ${Math.round(25 + 75 * Math.min(v, 20) / 20)}%, var(--line))`)

type RecoveryState = 'fresh' | 'recovering' | 'ready' | 'none'
const recoveryState = (r?: MuscleRecovery): RecoveryState => (!r ? 'none' : r.ready >= 1 ? 'ready' : r.ready < 0.5 ? 'fresh' : 'recovering')
const BADGE: Record<RecoveryState, string> = { fresh: 'bad', recovering: 'warn', ready: 'ok', none: '' }
const RECOVERY_COLOR: Record<RecoveryState, string> = { fresh: 'var(--bad)', recovering: 'var(--warn)', ready: 'var(--ok)', none: 'var(--line)' }

function MuscleCard() {
  const s = useStore()
  const lib = useMemo(() => exerciseMap(s), [s])
  const [mode, setMode] = useState<MapMode>('volumen')
  const [weekOffset, setWeekOffset] = useState(0)
  const [picked, setPicked] = useState<Muscle>()
  const weekStart = addDays(startOfWeek(today()), weekOffset * 7)
  const sets = weeklyMuscleSets(s.sessions, lib, weekStart)
  const recovery = useMemo(() => muscleRecovery(s.sessions, lib), [s.sessions, lib])
  const name = (m: Muscle) => tkr(`labels.muscle.${m}`)
  const volume = mode === 'volumen'
  const fill = (m: Muscle) => (volume ? volumeFill(sets[m] ?? 0) : RECOVERY_COLOR[recoveryState(recovery[m])])
  const label = (m: Muscle) =>
    volume
      ? tr('progress.body.setsLabel', { muscle: name(m), sets: fmt(sets[m] ?? 0, 1) })
      : tr('progress.body.recoveryLabel', { muscle: name(m), state: tkr(`progress.body.state.${recoveryState(recovery[m])}`) })
  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <h3>{tr('progress.muscleMap')}</h3>
          <p className="tiny muted">{volume ? tr('progress.muscleMapHint') : tr('progress.body.recoveryHint')}</p>
        </div>
        {volume && (
          <div className="row" style={{ gap: 4 }}>
            <button className="icon-btn" aria-label={tr('progress.prevWeek')} onClick={() => setWeekOffset(weekOffset - 1)}>
              <Icon name="back" size={18} />
            </button>
            <button className="icon-btn" aria-label={tr('progress.nextWeek')} disabled={weekOffset >= 0} onClick={() => setWeekOffset(weekOffset + 1)}>
              <Icon name="chevron" size={18} />
            </button>
          </div>
        )}
      </div>
      <Segmented
        value={mode}
        onChange={setMode}
        label={tr('progress.body.mode')}
        options={[
          { value: 'volumen', label: tr('progress.body.volume') },
          { value: 'erholung', label: tr('progress.body.recovery') },
        ]}
      />
      {volume && <span className="tiny muted">{tr('progress.weekFrom', { date: formatDate(weekStart) })}</span>}
      <BodyMap title={tr('progress.body.figure')} front={tr('progress.body.front')} back={tr('progress.body.back')} fill={fill} label={label} selected={picked} onSelect={setPicked} />
      {volume ? (
        <div className="row tiny muted" style={{ gap: 8 }} aria-hidden="true">
          <span>{tr('progress.body.none')}</span>
          <span className="grow" style={{ height: 8, borderRadius: 4, background: 'linear-gradient(to right, var(--line), var(--accent))' }} />
          <span className="num">20+</span>
        </div>
      ) : (
        <div className="row wrap tiny muted" style={{ gap: 12 }}>
          {(['fresh', 'recovering', 'ready'] as const).map((k) => (
            <span key={k} className="row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: RECOVERY_COLOR[k] }} />
              {tr(`progress.body.state.${k}`)}
            </span>
          ))}
        </div>
      )}
      <p className="tiny muted">{tr('progress.body.tapHint')}</p>
      <div className="list">
        {MUSCLE_ORDER.map((m) => {
          const v = sets[m] ?? 0
          const r = recovery[m]
          return (
            <button key={m} className="list-item" style={{ minHeight: 40, padding: '6px 0' }} onClick={() => setPicked(m)} aria-label={label(m)}>
              <span className="small" style={{ width: 92, fontWeight: 600, overflowWrap: 'anywhere' }}>
                {name(m)}
              </span>
              <div className="grow">
                {volume ? <Bar value={v} max={20} color={v >= 10 ? 'var(--ok)' : v >= 5 ? 'var(--warn)' : 'var(--muted)'} /> : <Bar value={r?.ready ?? 0} max={1} color={RECOVERY_COLOR[recoveryState(r)]} />}
              </div>
              <span className="small num" style={{ width: 40, textAlign: 'right' }}>
                {volume ? fmt(v, 1) : r ? tr('progress.body.percent', { n: Math.round(r.ready * 100) }) : '–'}
              </span>
            </button>
          )
        })}
      </div>
      <MuscleSheet muscle={picked} weekStart={weekStart} sets={picked ? sets[picked] ?? 0 : 0} recovery={picked ? recovery[picked] : undefined} onClose={() => setPicked(undefined)} />
    </div>
  )
}

function MuscleSheet({ muscle, weekStart, sets, recovery, onClose }: { muscle?: Muscle; weekStart: string; sets: number; recovery?: MuscleRecovery; onClose: () => void }) {
  const s = useStore()
  const lib = useMemo(() => exerciseMap(s), [s])
  const items = muscle ? muscleContributions(s.sessions, lib, muscle, weekStart) : []
  const level = sets <= 0 ? 'none' : sets < 5 ? 'low' : sets < 10 ? 'maintain' : sets <= 20 ? 'target' : 'high'
  const state = recoveryState(recovery)
  return (
    <Sheet open={!!muscle} onClose={onClose} title={muscle ? tkr(`labels.muscle.${muscle}`) : ''}>
      <div className="stack">
        <span className="tiny muted">{tr('progress.weekFrom', { date: formatDate(weekStart) })}</span>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <span className="num" style={{ fontSize: '2rem', fontWeight: 750 }}>
            {fmt(sets, 1)}
          </span>
          <span className="muted">{tr('progress.body.sets', { n: sets })}</span>
        </div>
        <p className="small">{tkr(`progress.body.level.${level}`)}</p>
        <div className="card stack" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="row between">
            <strong>{tr('progress.body.recovery')}</strong>
            <span className={`badge ${BADGE[state]}`}>{tkr(`progress.body.state.${state}`)}</span>
          </div>
          {recovery ? (
            <>
              <Bar value={recovery.ready} max={1} color={RECOVERY_COLOR[state]} />
              <span className="small">{recovery.ready >= 1 ? tr('progress.body.readyNow') : tr('progress.body.hoursLeft', { h: recovery.hoursLeft })}</span>
              <span className="tiny muted">{tr('progress.body.lastTrained', { date: formatDate(today(new Date(recovery.last)), { weekday: 'short', day: 'numeric', month: 'short' }) })}</span>
            </>
          ) : (
            <span className="small muted">{tr('progress.body.noRecent')}</span>
          )}
        </div>
        {items.length > 0 && (
          <>
            <h3>{tr('progress.body.exercises')}</h3>
            <div className="list">
              {items.map((c) => (
                <div key={c.exerciseId} className="list-item">
                  <span className="grow" style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                    {exerciseName(lib.get(c.exerciseId)!)}
                  </span>
                  {!c.primary && <span className="badge">{tr('progress.body.secondary')}</span>}
                  <span className="small num muted">{tr('progress.body.setsShort', { sets: fmt(c.sets, 1) })}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

function Calendar() {
  const s = useStore()
  const [offset, setOffset] = useState(0)
  const base = parseDay(today())
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const first = today(month)
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const train = new Set(s.sessions.filter((x) => x.finishedAt).map((x) => x.date))
  const mob = new Set(s.mobility.map((x) => x.date))
  const car = new Set(s.cardio.map((x) => x.date))
  const t = today()
  const mm = first.slice(0, 7)
  return (
    <div className="card stack">
      <div className="row between">
        <h3>{month.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })}</h3>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn" aria-label={tr('progress.prevMonth')} onClick={() => setOffset(offset - 1)}>
            <Icon name="back" size={18} />
          </button>
          <button className="icon-btn" aria-label={tr('progress.nextMonth')} disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>
      <div className="cal">
        {weekdaysShort().map((d) => (
          <span key={d} className="tiny muted" style={{ fontWeight: 700 }}>
            {d}
          </span>
        ))}
        {cells.map((d) => (
          <div key={d} className={`c ${d.slice(0, 7) !== mm ? 'out' : ''} ${d === t ? 'today' : ''}`}>
            <span>{Number(d.slice(8))}</span>
            <span className="dots">
              {train.has(d) && <i style={{ background: 'var(--accent)' }} />}
              {mob.has(d) && <i style={{ background: 'var(--ok)' }} />}
              {car.has(d) && <i style={{ background: 'var(--protein)' }} />}
            </span>
          </div>
        ))}
      </div>
      <div className="row wrap tiny muted" style={{ gap: 12 }}>
        <span className="row" style={{ gap: 4 }}>
          <i style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--accent)' }} /> {tr('progress.legendStrength')}
        </span>
        <span className="row" style={{ gap: 4 }}>
          <i style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--ok)' }} /> {tr('common.mobility')}
        </span>
        <span className="row" style={{ gap: 4 }}>
          <i style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--protein)' }} /> {tr('common.cardio')}
        </span>
      </div>
    </div>
  )
}

function Strength() {
  const s = useStore()
  const lib = useMemo(() => exerciseMap(s), [s])
  const prs = personalRecords(s.sessions)
  const [sel, setSel] = useState<string>(prs[0]?.exerciseId ?? '')
  const hist = sel ? e1rmHistory(s.sessions, sel) : []
  if (!prs.length) return <div className="card empty">{tr('progress.emptyStrength')}</div>
  return (
    <>
      <div className="card stack">
        <select className="input" value={sel} onChange={(e) => setSel(e.target.value)} aria-label={tr('progress.pickExercise')}>
          {prs.map((p) => (
            <option key={p.exerciseId} value={p.exerciseId}>
              {lib.get(p.exerciseId) ? exerciseName(lib.get(p.exerciseId)!) : p.exerciseId}
            </option>
          ))}
        </select>
        <h3>{tr('progress.e1rm')}</h3>
        <LineChart data={hist.map((h) => ({ x: formatDate(h.date), y: Math.round(h.value * 10) / 10 }))} unit="kg" label={tr('progress.e1rmChart')} />
        {hist.length >= 2 && (
          <p className="small muted">
            {tr('progress.sinceStart')} <strong style={{ color: 'var(--ok)' }}>{hist[hist.length - 1].value >= hist[0].value ? '+' : ''}{fmt(((hist[hist.length - 1].value - hist[0].value) / hist[0].value) * 100, 1)} %</strong>
          </p>
        )}
      </div>
      <div className="card stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>{tr('progress.records')}</h3>
        <div className="list">
          {prs.map((p) => (
            <button key={p.exerciseId} className="list-item" onClick={() => setSel(p.exerciseId)}>
              <span className="grow">
                <span style={{ fontWeight: 600 }}>{lib.get(p.exerciseId) ? exerciseName(lib.get(p.exerciseId)!) : p.exerciseId}</span>
                <span className="small muted" style={{ display: 'block' }}>
                  {fmt(p.weight, 2)} kg × {p.reps} · {formatDate(p.date)}
                </span>
              </span>
              <span className="num" style={{ fontWeight: 700 }}>
                {fmt(p.e1rm, 1)} kg
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function Body() {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const trend = weightTrend(s.weights)
  const last = trend[trend.length - 1]
  const first = trend[0]
  return (
    <>
      <div className="card stack">
        <div className="row between">
          <div>
            <h3>{tr('progress.bodyWeight')}</h3>
            <p className="tiny muted">{tr('progress.bodyLegend')}</p>
          </div>
          <button className="btn primary sm" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> {tr('progress.log')}
          </button>
        </div>
        <LineChart data={trend.slice(-60).map((t) => ({ x: formatDate(t.date), y: t.kg, y2: Math.round(t.trend * 10) / 10 }))} unit="kg" label={tr('progress.weightChart')} />
        {last && first && trend.length > 1 && (
          <div className="grid3">
            <div className="stat">
              <span className="v">{fmt(last.trend, 1)}</span>
              <span className="l">{tr('progress.trendKg')}</span>
            </div>
            <div className="stat">
              <span className="v">
                {last.trend - first.trend >= 0 ? '+' : ''}
                {fmt(last.trend - first.trend, 1)}
              </span>
              <span className="l">{tr('progress.sinceStartShort')}</span>
            </div>
            <div className="stat">
              <span className="v">{trend.length}</span>
              <span className="l">{tr('progress.entries')}</span>
            </div>
          </div>
        )}
      </div>
      <Measurements />
      <div className="card list" style={{ padding: '0 16px' }}>
        {[...s.weights].reverse().slice(0, 30).map((w) => (
          <div key={w.date} className="list-item">
            <span className="grow">{formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <strong className="num">{fmt(w.kg, 1)} kg</strong>
            <button className="icon-btn plain" aria-label={tr('progress.deleteEntry')} onClick={() => confirmAction(tr('progress.deleteEntryConfirm')) && s.removeWeight(w.date)}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>
      <WeightSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

const SITES: { k: MeasureSite; unit: string }[] = [
  { k: 'taille', unit: 'cm' },
  { k: 'huefte', unit: 'cm' },
  { k: 'brust', unit: 'cm' },
  { k: 'oberarm', unit: 'cm' },
  { k: 'oberschenkel', unit: 'cm' },
  { k: 'wade', unit: 'cm' },
  { k: 'koerperfett', unit: '%' },
]
const siteName = (k: MeasureSite) => tr(`progress.site.${k}`)

function Measurements() {
  const s = useStore()
  const [site, setSite] = useState<MeasureSite>('taille')
  const [open, setOpen] = useState(false)
  const series = s.measurements.filter((m) => m.values[site] != null).map((m) => ({ x: formatDate(m.date), y: m.values[site]! }))
  const first = (k: MeasureSite) => s.measurements.find((m) => m.values[k] != null)?.values[k]
  const last = (k: MeasureSite) => [...s.measurements].reverse().find((m) => m.values[k] != null)?.values[k]
  const meta = SITES.find((x) => x.k === site)!
  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <h3>{tr('progress.measures')}</h3>
          <p className="tiny muted">{tr('progress.measuresHint')}</p>
        </div>
        <button className="btn primary sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> {tr('progress.measure')}
        </button>
      </div>
      {s.measurements.length === 0 ? (
        <p className="small muted">{tr('progress.noMeasures')}</p>
      ) : (
        <>
          <div className="grid3">
            {SITES.filter((x) => last(x.k) != null).map((x) => {
              const d = last(x.k)! - first(x.k)!
              return (
                <button key={x.k} className={`card tight stat ${site === x.k ? 'on' : ''}`} style={{ textAlign: 'left', borderColor: site === x.k ? 'var(--accent)' : undefined }} onClick={() => setSite(x.k)} aria-pressed={site === x.k}>
                  <span className="l">{siteName(x.k)}</span>
                  <span className="v" style={{ fontSize: '1.1rem' }}>
                    {fmt(last(x.k)!, 1)}
                    <span className="tiny muted"> {x.unit}</span>
                  </span>
                  {d !== 0 && (
                    <span className="tiny num" style={{ color: 'var(--muted)' }}>
                      {d > 0 ? '+' : ''}
                      {fmt(d, 1)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <LineChart data={series} unit={meta.unit} label={tr('progress.measureChart', { site: siteName(meta.k) })} />
        </>
      )}
      {open && <MeasureSheet onClose={() => setOpen(false)} />}
    </div>
  )
}

function MeasureSheet({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const prev = s.measurements[s.measurements.length - 1]?.values ?? {}
  const [vals, setVals] = useState<Record<string, string>>({})
  const num = (v: string) => parseFloat(v.replace(',', '.'))
  const filled = Object.entries(vals).filter(([, v]) => Number.isFinite(num(v)))
  return (
    <Sheet open onClose={onClose} title={tr('progress.measureTitle')}>
      <div className="stack lg">
        <p className="small muted">{tr('progress.measureHint')}</p>
        <div className="grid2">
          {SITES.map((x) => (
            <div key={x.k} className="field">
              <label htmlFor={`m-${x.k}`}>
                {siteName(x.k)} ({x.unit})
              </label>
              <input
                id={`m-${x.k}`}
                className="input"
                inputMode="decimal"
                placeholder={prev[x.k] != null ? fmt(prev[x.k]!, 1) : ''}
                value={vals[x.k] ?? ''}
                onChange={(e) => setVals({ ...vals, [x.k]: e.target.value.replace(/[^0-9.,]/g, '') })}
              />
            </div>
          ))}
        </div>
        <button
          className="btn primary block"
          disabled={!filled.length}
          onClick={() => {
            s.logMeasurement({ date: today(), values: Object.fromEntries(filled.map(([k, v]) => [k, num(v)])) })
            toast(tr('progress.measuresSaved'))
            onClose()
          }}
        >
          {tr('common.save')}
        </button>
      </div>
    </Sheet>
  )
}

function History() {
  const s = useStore()
  const [detail, setDetail] = useState<WorkoutSession | null>(null)
  const done = [...s.sessions].filter((x) => x.finishedAt).reverse()
  if (!done.length) return <div className="card empty">{tr('progress.noWorkouts')}</div>
  return (
    <>
      <div className="card list" style={{ padding: '0 16px' }}>
        {done.map((x) => (
          <button key={x.id} className="list-item" onClick={() => setDetail(x)}>
            <span className="grow">
              <span style={{ fontWeight: 600 }}>{sessionDayName(x)}</span>
              <span className="small muted" style={{ display: 'block' }}>
                {tr('progress.historyMeta', { date: formatDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' }), sets: sessionSets(x), min: sessionMinutes(x) ?? 0 })} {x.deload ? tr('progress.deloadSuffix') : ''}
              </span>
            </span>
            <span className="num small">{fmt(sessionVolume(x) / 1000, 1)} t</span>
          </button>
        ))}
      </div>
      <SessionDetail session={detail} onClose={() => setDetail(null)} />
    </>
  )
}

function SessionDetail({ session, onClose }: { session: WorkoutSession | null; onClose: () => void }) {
  const s = useStore()
  const lib = exerciseMap(s)
  if (!session) return null
  return (
    <Sheet open onClose={onClose} title={sessionDayName(session)}>
      <div className="stack lg">
        <p className="small muted">
          {tr('progress.detailMeta', { date: formatDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' }), week: session.week + 1 })}
          {session.readiness != null ? tr('progress.detailReadiness', { n: session.readiness }) : ''}
        </p>
        {session.exercises.map((e) => (
          <div key={e.key} className="card tight stack" style={{ gap: 4 }}>
            <strong>{lib.get(e.exerciseId) ? exerciseName(lib.get(e.exerciseId)!) : e.exerciseId}</strong>
            {workSets(e).map((x, i) => (
              <span key={i} className="small num">
                {x.kind === 'test' ? tr('progress.test') : tr('progress.setN', { n: i + 1 })}: {x.weight ? `${fmt(x.weight, 2)} kg × ` : ''}
                {tr('progress.setLine', { reps: x.reps ?? 0 })} {x.rir != null ? `@ ${x.rir} RIR` : ''}
              </span>
            ))}
          </div>
        ))}
        {session.notes && <p className="small">{tr('progress.noteLabel', { note: session.notes })}</p>}
        <button
          className="btn danger block"
          onClick={() => {
            if (confirmAction(tr('progress.deleteWorkoutConfirm'))) {
              s.deleteSession(session.id)
              onClose()
            }
          }}
        >
          <Icon name="trash" size={18} /> {tr('progress.deleteWorkout')}
        </button>
      </div>
    </Sheet>
  )
}
