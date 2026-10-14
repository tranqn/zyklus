import { useMemo, useState } from 'react'
import { MUSCLE_LABEL } from '../domain/exercises'
import { weightTrend } from '../domain/nutrition'
import { workSets } from '../domain/progression'
import { personalRecords, sessionMinutes, sessionSets, sessionVolume, streak, weeklyMuscleSets } from '../domain/stats'
import type { MeasureSite, Muscle, WorkoutSession } from '../domain/types'
import { addDays, fmt, formatDate, parseDay, startOfWeek, today, WEEKDAYS_SHORT } from '../domain/util'
import { e1rmHistory, exerciseMap, useStore } from '../store'
import { Bar, Icon, LineChart, Segmented, Sheet } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { WeightSheet } from './Today'

type Tab = 'uebersicht' | 'kraft' | 'koerper' | 'verlauf'

export default function Progress() {
  const [tab, setTab] = useState<Tab>('uebersicht')
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Fortschritt</div>
          <h1>Deine Entwicklung</h1>
        </div>
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        label="Bereich"
        options={[
          { value: 'uebersicht', label: 'Übersicht' },
          { value: 'kraft', label: 'Kraft' },
          { value: 'koerper', label: 'Körper' },
          { value: 'verlauf', label: 'Verlauf' },
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
  const lib = useMemo(() => exerciseMap(s), [s])
  const [weekOffset, setWeekOffset] = useState(0)
  const done = s.sessions.filter((x) => x.finishedAt)
  const weekStart = addDays(startOfWeek(today()), weekOffset * 7)
  const thisWeek = done.filter((x) => x.date >= weekStart && x.date < addDays(weekStart, 7))
  const muscles = weeklyMuscleSets(s.sessions, lib, weekStart)
  const order: Muscle[] = ['brust', 'ruecken', 'schultern', 'bizeps', 'trizeps', 'quadrizeps', 'beinbeuger', 'gesaess', 'waden', 'bauch', 'unterarme']
  const totalVolume = done.reduce((a, x) => a + sessionVolume(x), 0)
  return (
    <>
      <div className="grid2">
        <div className="card stat">
          <span className="v">{done.length}</span>
          <span className="l">Trainings gesamt</span>
        </div>
        <div className="card stat">
          <span className="v">{streak(s)}</span>
          <span className="l">Tage Serie</span>
        </div>
        <div className="card stat">
          <span className="v">{thisWeek.length}</span>
          <span className="l">Trainings in der Woche</span>
        </div>
        <div className="card stat">
          <span className="v">{fmt(totalVolume / 1000, 1)} t</span>
          <span className="l">Bewegtes Gewicht</span>
        </div>
      </div>

      <Calendar />

      <div className="card stack">
        <div className="row between">
          <div>
            <h3>Muskel-Map</h3>
            <p className="tiny muted">Harte Sätze pro Muskel, Nebenmuskeln zählen halb. Richtwert 10 bis 20 pro Woche.</p>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className="icon-btn" aria-label="Vorherige Woche" onClick={() => setWeekOffset(weekOffset - 1)}>
              <Icon name="back" size={18} />
            </button>
            <button className="icon-btn" aria-label="Nächste Woche" disabled={weekOffset >= 0} onClick={() => setWeekOffset(weekOffset + 1)}>
              <Icon name="chevron" size={18} />
            </button>
          </div>
        </div>
        <span className="tiny muted">Woche ab {formatDate(weekStart)}</span>
        {order.map((m) => {
          const v = muscles[m] ?? 0
          const color = v >= 10 ? 'var(--ok)' : v >= 5 ? 'var(--warn)' : 'var(--muted)'
          return (
            <div key={m} className="row" style={{ gap: 10 }}>
              <span className="small" style={{ width: 92, fontWeight: 600 }}>
                {MUSCLE_LABEL[m]}
              </span>
              <div className="grow">
                <Bar value={v} max={20} color={color} />
              </div>
              <span className="small num" style={{ width: 30, textAlign: 'right' }}>
                {fmt(v, 1)}
              </span>
            </div>
          )
        })}
      </div>
    </>
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
        <h3>{month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</h3>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn" aria-label="Vorheriger Monat" onClick={() => setOffset(offset - 1)}>
            <Icon name="back" size={18} />
          </button>
          <button className="icon-btn" aria-label="Nächster Monat" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>
      <div className="cal">
        {WEEKDAYS_SHORT.map((d) => (
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
          <i style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--accent)' }} /> Krafttraining
        </span>
        <span className="row" style={{ gap: 4 }}>
          <i style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--ok)' }} /> Mobility
        </span>
        <span className="row" style={{ gap: 4 }}>
          <i style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--protein)' }} /> Cardio
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
  if (!prs.length) return <div className="card empty">Nach deinem ersten Training siehst du hier deine Kraftentwicklung.</div>
  return (
    <>
      <div className="card stack">
        <select className="input" value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Übung wählen">
          {prs.map((p) => (
            <option key={p.exerciseId} value={p.exerciseId}>
              {lib.get(p.exerciseId)?.name ?? p.exerciseId}
            </option>
          ))}
        </select>
        <h3>Geschätztes Maximum (1RM)</h3>
        <LineChart data={hist.map((h) => ({ x: formatDate(h.date), y: Math.round(h.value * 10) / 10 }))} unit="kg" label="Verlauf des geschätzten Maximalgewichts" />
        {hist.length >= 2 && (
          <p className="small muted">
            Seit Beginn: <strong style={{ color: 'var(--ok)' }}>{hist[hist.length - 1].value >= hist[0].value ? '+' : ''}{fmt(((hist[hist.length - 1].value - hist[0].value) / hist[0].value) * 100, 1)} %</strong>
          </p>
        )}
      </div>
      <div className="card stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>Bestleistungen</h3>
        <div className="list">
          {prs.map((p) => (
            <button key={p.exerciseId} className="list-item" onClick={() => setSel(p.exerciseId)}>
              <span className="grow">
                <span style={{ fontWeight: 600 }}>{lib.get(p.exerciseId)?.name}</span>
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
            <h3>Körpergewicht</h3>
            <p className="tiny muted">Graue Punkte: Messungen · Linie: geglätteter Trend</p>
          </div>
          <button className="btn primary sm" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> Eintragen
          </button>
        </div>
        <LineChart data={trend.slice(-60).map((t) => ({ x: formatDate(t.date), y: t.kg, y2: Math.round(t.trend * 10) / 10 }))} unit="kg" label="Gewichtsverlauf mit Trendlinie" />
        {last && first && trend.length > 1 && (
          <div className="grid3">
            <div className="stat">
              <span className="v">{fmt(last.trend, 1)}</span>
              <span className="l">Trend kg</span>
            </div>
            <div className="stat">
              <span className="v">
                {last.trend - first.trend >= 0 ? '+' : ''}
                {fmt(last.trend - first.trend, 1)}
              </span>
              <span className="l">seit Start</span>
            </div>
            <div className="stat">
              <span className="v">{trend.length}</span>
              <span className="l">Messungen</span>
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
            <button className="icon-btn plain" aria-label="Eintrag löschen" onClick={() => confirmAction('Eintrag löschen?') && s.removeWeight(w.date)}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>
      <WeightSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

const SITES: { k: MeasureSite; l: string; unit: string }[] = [
  { k: 'taille', l: 'Taille', unit: 'cm' },
  { k: 'huefte', l: 'Hüfte', unit: 'cm' },
  { k: 'brust', l: 'Brust', unit: 'cm' },
  { k: 'oberarm', l: 'Oberarm', unit: 'cm' },
  { k: 'oberschenkel', l: 'Oberschenkel', unit: 'cm' },
  { k: 'wade', l: 'Wade', unit: 'cm' },
  { k: 'koerperfett', l: 'Körperfett', unit: '%' },
]

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
          <h3>Körpermaße</h3>
          <p className="tiny muted">Alle 2 bis 4 Wochen messen, morgens, gleiche Stelle.</p>
        </div>
        <button className="btn primary sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> Messen
        </button>
      </div>
      {s.measurements.length === 0 ? (
        <p className="small muted">Noch keine Maße. Taillenumfang ist oft aussagekräftiger als das Gewicht.</p>
      ) : (
        <>
          <div className="grid3">
            {SITES.filter((x) => last(x.k) != null).map((x) => {
              const d = last(x.k)! - first(x.k)!
              return (
                <button key={x.k} className={`card tight stat ${site === x.k ? 'on' : ''}`} style={{ textAlign: 'left', borderColor: site === x.k ? 'var(--accent)' : undefined }} onClick={() => setSite(x.k)} aria-pressed={site === x.k}>
                  <span className="l">{x.l}</span>
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
          <LineChart data={series} unit={meta.unit} label={`Verlauf ${meta.l}`} />
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
    <Sheet open onClose={onClose} title="Körpermaße eintragen">
      <div className="stack lg">
        <p className="small muted">Nur ausfüllen, was du gemessen hast. Grau steht dein letzter Wert.</p>
        <div className="grid2">
          {SITES.map((x) => (
            <div key={x.k} className="field">
              <label htmlFor={`m-${x.k}`}>
                {x.l} ({x.unit})
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
            toast('Maße gespeichert')
            onClose()
          }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}

function History() {
  const s = useStore()
  const [detail, setDetail] = useState<WorkoutSession | null>(null)
  const done = [...s.sessions].filter((x) => x.finishedAt).reverse()
  if (!done.length) return <div className="card empty">Noch keine Trainings gespeichert.</div>
  return (
    <>
      <div className="card list" style={{ padding: '0 16px' }}>
        {done.map((x) => (
          <button key={x.id} className="list-item" onClick={() => setDetail(x)}>
            <span className="grow">
              <span style={{ fontWeight: 600 }}>{x.dayName}</span>
              <span className="small muted" style={{ display: 'block' }}>
                {formatDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {sessionSets(x)} Sätze · {sessionMinutes(x)} min {x.deload ? '· Deload' : ''}
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
    <Sheet open onClose={onClose} title={session.dayName}>
      <div className="stack lg">
        <p className="small muted">
          {formatDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' })} · Woche {session.week + 1}
          {session.readiness != null ? ` · Tagesform ${session.readiness}/100` : ''}
        </p>
        {session.exercises.map((e) => (
          <div key={e.key} className="card tight stack" style={{ gap: 4 }}>
            <strong>{lib.get(e.exerciseId)?.name}</strong>
            {workSets(e).map((x, i) => (
              <span key={i} className="small num">
                {x.kind === 'test' ? 'Test' : `Satz ${i + 1}`}: {x.weight ? `${fmt(x.weight, 2)} kg × ` : ''}
                {x.reps} Wdh. {x.rir != null ? `@ ${x.rir} RIR` : ''}
              </span>
            ))}
          </div>
        ))}
        {session.notes && <p className="small">Notiz: {session.notes}</p>}
        <button
          className="btn danger block"
          onClick={() => {
            if (confirmAction('Dieses Training endgültig löschen?')) {
              s.deleteSession(session.id)
              onClose()
            }
          }}
        >
          <Icon name="trash" size={18} /> Training löschen
        </button>
      </div>
    </Sheet>
  )
}
