import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { hasEquipment, MUSCLE_LABEL } from '../domain/exercises'
import { prsInSession, sessionSets, sessionVolume } from '../domain/stats'
import type { Exercise, SessionExercise, SetEntry } from '../domain/types'
import { fmt } from '../domain/util'
import { allExercises, exerciseMap, useStore } from '../store'
import { confirmAction, Icon, Sheet, toast } from '../ui/kit'

export default function Workout() {
  const s = useStore()
  const nav = useNavigate()
  const active = s.active
  const lib = useMemo(() => exerciseMap(s), [s])
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)
  const [swapKey, setSwapKey] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  useWakeLock(!!active)

  if (!active) return <Navigate to="/" replace />

  const totalWork = active.exercises.reduce((a, e) => a + e.sets.filter((x) => x.kind !== 'aufwaermen').length, 0)
  const doneWork = active.exercises.reduce((a, e) => a + e.sets.filter((x) => x.kind !== 'aufwaermen' && x.done).length, 0)

  const onSetDone = (se: SessionExercise, idx: number) => {
    const set = se.sets[idx]
    if (set.done) {
      s.updateSet(se.key, idx, { done: false })
      return
    }
    const patch: Partial<SetEntry> = {
      done: true,
      weight: set.weight ?? set.targetWeight,
      reps: set.reps ?? set.targetReps,
      rir: set.rir ?? (set.kind === 'aufwaermen' ? undefined : set.targetRir),
    }
    const ex = lib.get(se.exerciseId)
    if (ex?.loadType === 'gewicht' && patch.weight == null && set.kind !== 'aufwaermen') {
      toast('Bitte zuerst das Gewicht eintragen')
      return
    }
    s.updateSet(se.key, idx, patch)
    // superset: rest only after the second exercise of the pair
    const partner = se.superset ? active.exercises.find((e) => e.superset === se.superset && e.key !== se.key) : undefined
    const partnerFirst = partner && active.exercises.indexOf(partner) > active.exercises.indexOf(se)
    const secs = set.kind === 'aufwaermen' ? 60 : partnerFirst ? 0 : se.restSec
    if (secs > 0) setRest({ end: Date.now() + secs * 1000, total: secs })
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(120px + var(--safe-b))' }}>
      <div className="row between" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', margin: '-16px -16px 0', padding: 'calc(8px + var(--safe-t)) 16px 8px' }}>
        <button className="icon-btn" onClick={() => nav('/')} aria-label="Zurück zur Übersicht (Training läuft weiter)">
          <Icon name="back" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{active.dayName}</div>
          <div className="tiny muted num">
            <Elapsed since={active.startedAt} /> · {doneWork}/{totalWork} Sätze
          </div>
        </div>
        <button className="btn primary sm" onClick={() => setFinishOpen(true)}>
          Fertig
        </button>
      </div>
      <div className="bar" aria-hidden="true">
        <div style={{ width: `${totalWork ? (doneWork / totalWork) * 100 : 0}%`, background: 'var(--ok)' }} />
      </div>

      {(active.readiness != null || active.deload) && (
        <div className="row wrap">
          {active.deload && <span className="badge warn">Deload-Woche: locker bleiben</span>}
          {active.readiness != null && (
            <span className={`badge ${active.readiness >= 70 ? 'ok' : active.readiness >= 45 ? '' : 'warn'}`}>Tagesform {active.readiness}/100</span>
          )}
        </div>
      )}

      {active.exercises.map((se) => {
        const ex = lib.get(se.exerciseId)
        if (!ex) return null
        return (
          <ExerciseCard
            key={se.key}
            se={se}
            ex={ex}
            onInfo={() => setInfo(ex)}
            onSwap={() => setSwapKey(se.key)}
            onDone={(i) => onSetDone(se, i)}
            onChange={(i, patch) => s.updateSet(se.key, i, patch)}
            onAdd={() => s.addSet(se.key)}
            onRemove={(i) => s.removeSet(se.key, i)}
          />
        )
      })}

      <button
        className="btn ghost danger block"
        onClick={() => {
          if (confirmAction('Training verwerfen? Eingetragene Sätze gehen verloren.')) {
            s.discardSession()
            nav('/')
          }
        }}
      >
        Training verwerfen
      </button>

      {rest && <RestTimer rest={rest} onChange={setRest} sound={s.settings.restTimerSound} vibrate={s.settings.restTimerVibrate} />}
      <ExerciseInfo ex={info} onClose={() => setInfo(null)} />
      <SwapSheet exKey={swapKey} onClose={() => setSwapKey(null)} />
      <FinishSheet open={finishOpen} onClose={() => setFinishOpen(false)} />
    </div>
  )
}

function ExerciseCard({
  se,
  ex,
  onInfo,
  onSwap,
  onDone,
  onChange,
  onAdd,
  onRemove,
}: {
  se: SessionExercise
  ex: Exercise
  onInfo: () => void
  onSwap: () => void
  onDone: (i: number) => void
  onChange: (i: number, p: Partial<SetEntry>) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const bw = ex.loadType === 'koerpergewicht'
  const work = se.sets.filter((x) => x.kind !== 'aufwaermen')
  const allDone = se.sets.length > 0 && se.sets.every((x) => x.done)
  let n = 0
  return (
    <section className="card stack" style={{ gap: 10, opacity: allDone ? 0.75 : 1 }} aria-label={ex.name}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <button className="grow" onClick={onInfo} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}>
          {se.superset && <span className="ss-tag">SUPERSATZ {se.superset} · </span>}
          <h3 style={{ display: 'inline' }}>{ex.name}</h3>
          <div className="small muted">
            {work.length} × {se.repMin}–{se.repMax} Wdh. · {work[0]?.targetRir ?? 2} RIR · Pause {fmt(se.restSec / 60, 1)} min
          </div>
        </button>
        <button className="icon-btn plain" onClick={onSwap} aria-label={`${ex.name} tauschen`}>
          <Icon name="swap" size={20} />
        </button>
      </div>
      {se.note && (
        <p className="small" style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 10 }}>
          {se.note}
        </p>
      )}
      <div className="set-row head">
        <span>Satz</span>
        <span style={{ textAlign: 'center' }}>{bw ? 'Zusatz kg' : 'kg'}</span>
        <span style={{ textAlign: 'center' }}>Wdh.</span>
        <span style={{ textAlign: 'center' }}>RIR</span>
        <span />
      </div>
      {se.sets.map((set, i) => {
        const label = set.kind === 'aufwaermen' ? 'W' : set.kind === 'test' ? 'T' : String(++n)
        return (
          <div key={i} className={`set-row ${set.done ? 'done' : ''}`}>
            <button
              className={`set-idx ${set.kind === 'aufwaermen' ? 'warm' : set.kind === 'test' ? 'test' : ''}`}
              aria-label={`Satz ${label} entfernen`}
              title={set.kind === 'aufwaermen' ? 'Aufwärmsatz' : set.kind === 'test' ? 'Krafttest-Satz' : 'Arbeitssatz'}
              onClick={() => {
                if (confirmAction('Diesen Satz entfernen?')) onRemove(i)
              }}
            >
              {label}
            </button>
            <NumInput
              value={set.weight}
              placeholder={set.targetWeight != null ? fmt(set.targetWeight, 2) : bw ? '0' : '?'}
              onChange={(v) => onChange(i, { weight: v })}
              label={`Gewicht Satz ${label}`}
              decimal
            />
            <NumInput value={set.reps} placeholder={String(set.targetReps)} onChange={(v) => onChange(i, { reps: v })} label={`Wiederholungen Satz ${label}`} />
            <select
              className="set-input"
              style={{ padding: 0, fontSize: 15, color: set.rir == null && !set.done ? 'var(--muted)' : undefined }}
              aria-label={`Wiederholungen in Reserve Satz ${label}`}
              value={set.rir ?? ''}
              onChange={(e) => onChange(i, { rir: e.target.value === '' ? undefined : Number(e.target.value) })}
              disabled={set.kind === 'aufwaermen'}
            >
              <option value="">{set.kind === 'aufwaermen' ? '–' : set.targetRir}</option>
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button className={`check ${set.done ? 'on' : ''}`} onClick={() => onDone(i)} aria-pressed={set.done} aria-label={`Satz ${label} ${set.done ? 'als offen markieren' : 'abhaken'}`}>
              <Icon name="check" size={20} stroke={2.6} />
            </button>
          </div>
        )
      })}
      {se.sets.some((x) => x.kind === 'test' && !x.done) && (
        <p className="tiny muted">T = Krafttest: Arbeite dich an ein Gewicht heran, bei dem du ca. {se.sets.find((x) => x.kind === 'test')?.targetReps} saubere Wdh. schaffst und noch 2 im Tank hast. Daraus berechnet die App alle weiteren Sätze.</p>
      )}
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={onAdd}>
        <Icon name="plus" size={16} /> Satz hinzufügen
      </button>
    </section>
  )
}

function NumInput({ value, placeholder, onChange, label, decimal }: { value?: number; placeholder: string; onChange: (v: number | undefined) => void; label: string; decimal?: boolean }) {
  // null = not editing: show the stored value; while typing keep the raw text (e.g. "62,")
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value != null ? String(value).replace('.', ',') : '')
  return (
    <input
      className="set-input"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      onFocus={(e) => {
        setDraft(shown)
        e.currentTarget.select()
      }}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, '')
        setDraft(t)
        const n = parseFloat(t.replace(',', '.'))
        onChange(Number.isFinite(n) ? n : undefined)
      }}
    />
  )
}

function Elapsed({ since }: { since: string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const secs = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const ss = secs % 60
  return <>{h ? `${h}:${String(m).padStart(2, '0')}` : m}:{String(ss).padStart(2, '0')}</>
}

function beep() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = t === 0.5 ? 1320 : 880
      g.gain.setValueAtTime(0.25, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.2)
    })
  } catch {
    /* audio not available */
  }
}

function RestTimer({ rest, onChange, sound, vibrate }: { rest: { end: number; total: number }; onChange: (r: { end: number; total: number } | null) => void; sound: boolean; vibrate: boolean }) {
  const [now, setNow] = useState(Date.now())
  const fired = useRef(false)
  useEffect(() => {
    fired.current = false
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [rest.end])
  const left = Math.max(0, Math.ceil((rest.end - now) / 1000))
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true
      if (sound) beep()
      if (vibrate && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
      const t = window.setTimeout(() => onChange(null), 2500)
      return () => window.clearTimeout(t)
    }
  }, [left, sound, vibrate, onChange])
  const m = Math.floor(left / 60)
  const sec = left % 60
  return (
    <div className="timer-bar" role="timer" aria-live="off" aria-label="Satzpause">
      <Icon name="timer" />
      <span className="t">{left === 0 ? 'Los!' : `${m}:${String(sec).padStart(2, '0')}`}</span>
      <button onClick={() => onChange({ ...rest, end: rest.end - 15000 })} aria-label="15 Sekunden weniger">
        −15
      </button>
      <button onClick={() => onChange({ end: rest.end + 15000, total: rest.total + 15 })} aria-label="15 Sekunden mehr">
        +15
      </button>
      <button onClick={() => onChange(null)} aria-label="Pause überspringen">
        <Icon name="close" size={18} />
      </button>
      <div className="timer-progress">
        <div style={{ width: `${(1 - left / rest.total) * 100}%` }} />
      </div>
    </div>
  )
}

function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => undefined)
    }
    acquire()
    const onVis = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => undefined)
    }
  }, [on])
}

export function ExerciseInfo({ ex, onClose }: { ex: Exercise | null; onClose: () => void }) {
  return (
    <Sheet open={!!ex} onClose={onClose} title={ex?.name}>
      {ex && (
        <div className="stack lg">
          <div className="row wrap">
            <span className="badge accent">{MUSCLE_LABEL[ex.primary]}</span>
            {ex.secondary.map((m) => (
              <span key={m} className="badge">
                {MUSCLE_LABEL[m]}
              </span>
            ))}
          </div>
          <div className="stack">
            <h3>Ausführung</h3>
            <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
              {ex.cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </div>
          <a className="btn block" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' Ausführung')}`} target="_blank" rel="noreferrer">
            Video-Anleitungen suchen
          </a>
        </div>
      )}
    </Sheet>
  )
}

function SwapSheet({ exKey, onClose }: { exKey: string | null; onClose: () => void }) {
  const s = useStore()
  const [permanent, setPermanent] = useState(true)
  const [anyEquipment, setAnyEquipment] = useState(false)
  const se = s.active?.exercises.find((e) => e.key === exKey)
  const options = se
    ? allExercises(s).filter((e) => e.slot === se.slot && e.id !== se.exerciseId && (anyEquipment || hasEquipment(s.profile!.equipment, e)))
    : []
  return (
    <Sheet open={!!se} onClose={onClose} title="Übung tauschen">
      <div className="stack lg">
        <p className="muted small">Alternativen für dasselbe Bewegungsmuster. Das erste Gewicht wird per Testsatz neu ermittelt.</p>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span>Auch im Plan dauerhaft ersetzen</span>
        </label>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" checked={anyEquipment} onChange={(e) => setAnyEquipment(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span>Auch Übungen mit anderer Ausstattung zeigen</span>
        </label>
        <div className="card list" style={{ padding: '0 16px' }}>
          {options.length === 0 && <p className="empty">Keine Alternativen mit deiner Ausstattung.</p>}
          {options.map((o) => (
            <button
              key={o.id}
              className="list-item"
              onClick={() => {
                s.swapExercise(exKey!, o.id, permanent)
                toast(`Getauscht: ${o.name}`)
                onClose()
              }}
            >
              <span className="grow">
                <strong>{o.name}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  {o.cues[0]}
                </span>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

function FinishSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore()
  const nav = useNavigate()
  const lib = useMemo(() => exerciseMap(s), [s])
  const [rating, setRating] = useState(4)
  const [notes, setNotes] = useState('')
  const active = s.active
  if (!active) return null
  const preview = { ...active, finishedAt: new Date().toISOString(), exercises: active.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })) }
  const open_ = active.exercises.reduce((a, e) => a + e.sets.filter((x) => !x.done && x.kind !== 'aufwaermen').length, 0)
  const prs = prsInSession([...s.sessions, preview], preview)
  const mins = Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000)
  return (
    <Sheet open={open} onClose={onClose} title="Training abschließen">
      <div className="stack lg">
        <div className="grid3">
          <div className="card tight stat">
            <span className="v">{mins}</span>
            <span className="l">Minuten</span>
          </div>
          <div className="card tight stat">
            <span className="v">{sessionSets(preview)}</span>
            <span className="l">Sätze</span>
          </div>
          <div className="card tight stat">
            <span className="v">{fmt(sessionVolume(preview) / 1000, 1)} t</span>
            <span className="l">Volumen</span>
          </div>
        </div>
        {prs.length > 0 && (
          <div className="card" style={{ background: 'var(--ok-soft)', borderColor: 'transparent' }}>
            <strong>Neue Bestleistung{prs.length > 1 ? 'en' : ''}!</strong>
            <p className="small">{prs.map((id) => lib.get(id)?.name).join(', ')}</p>
          </div>
        )}
        {open_ > 0 && <p className="small" style={{ color: 'var(--warn)' }}>{open_} Sätze sind noch offen. Sie werden nicht gespeichert.</p>}
        <div className="stack">
          <span className="label">Wie war das Training?</span>
          <div className="grid3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {['😫', '😕', '😐', '🙂', '🔥'].map((e, i) => (
              <button key={e} className="chip" style={{ justifyContent: 'center', fontSize: '1.3rem', minHeight: 52 }} aria-pressed={rating === i + 1} aria-label={`Bewertung ${i + 1} von 5`} onClick={() => setRating(i + 1)}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">Notiz (optional)</label>
          <textarea id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z. B. Schulter gezwickt, neue Maschine ausprobiert" />
        </div>
        <button
          className="btn primary block"
          onClick={() => {
            s.finishSession(rating, notes.trim() || undefined)
            toast('Training gespeichert 💪')
            nav('/')
          }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}
