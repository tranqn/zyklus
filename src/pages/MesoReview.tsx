import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { bestE1rm } from '../domain/progression'
import { fmt } from '../domain/util'
import { exerciseMap, useStore } from '../store'
import { Icon, toast } from '../ui/kit'

export default function MesoReview() {
  const s = useStore()
  const nav = useNavigate()
  const lib = useMemo(() => exerciseMap(s), [s])
  const meso = s.meso
  if (!meso) return <Navigate to="/" replace />
  const sessions = s.sessions.filter((x) => x.mesoId === meso.id && x.finishedAt)
  const ready = sessions.map((x) => x.readiness).filter((x): x is number => x != null)
  const ratings = sessions.map((x) => x.rating).filter((x): x is number => x != null)
  const avgReady = ready.length ? ready.reduce((a, b) => a + b, 0) / ready.length : undefined
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined

  const progress = new Map<string, { first: number; last: number }>()
  for (const x of sessions) {
    if (x.deload) continue
    for (const e of x.exercises) {
      const v = bestE1rm(e)
      if (!v) continue
      const p = progress.get(e.exerciseId)
      if (!p) progress.set(e.exerciseId, { first: v, last: v })
      else p.last = v
    }
  }
  const rows = [...progress.entries()].map(([id, p]) => ({ id, ...p, pct: ((p.last - p.first) / p.first) * 100 })).sort((a, b) => b.pct - a.pct)
  const improved = rows.filter((r) => r.pct > 0.5).length

  // more volume only when recovery and mood were good
  let bonus = 0
  let advice = 'Gleiches Volumen wie bisher, neue Akzente bei den Zusatzübungen.'
  if ((avgReady ?? 60) >= 65 && (avgRating ?? 3.5) >= 3.5 && improved >= rows.length / 2) {
    bonus = 1
    advice = 'Du hast dich gut erholt und bist stärker geworden: Grundübungen bekommen einen Satz mehr.'
  } else if ((avgReady ?? 60) < 45) {
    advice = 'Deine Tagesform war oft niedrig. Das Volumen bleibt gleich, achte auf Schlaf und Ernährung.'
  }

  const start = (b: number) => {
    s.startNextMeso(b)
    toast(`Mesozyklus ${meso.number + 1} gestartet`)
    nav('/plan')
  }

  return (
    <div className="page">
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Zurück">
          <Icon name="back" />
        </button>
      </div>
      <div className="stack">
        <div className="eyebrow">Auswertung</div>
        <h1>Mesozyklus {meso.number}</h1>
      </div>
      <div className="grid3">
        <div className="card tight stat">
          <span className="v">{sessions.length}</span>
          <span className="l">Einheiten</span>
        </div>
        <div className="card tight stat">
          <span className="v">{avgReady != null ? Math.round(avgReady) : '–'}</span>
          <span className="l">Ø Tagesform</span>
        </div>
        <div className="card tight stat">
          <span className="v">
            {improved}/{rows.length}
          </span>
          <span className="l">Übungen stärker</span>
        </div>
      </div>
      <div className="card stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>Kraftentwicklung (geschätztes 1RM)</h3>
        <div className="list">
          {rows.length === 0 && <p className="empty">Keine vergleichbaren Daten.</p>}
          {rows.map((r) => (
            <div key={r.id} className="list-item">
              <span className="grow">
                <span style={{ fontWeight: 600 }}>{lib.get(r.id)?.name}</span>
                <span className="small muted num" style={{ display: 'block' }}>
                  {fmt(r.first, 1)} → {fmt(r.last, 1)} kg
                </span>
              </span>
              <span className={`badge ${r.pct > 0.5 ? 'ok' : r.pct < -0.5 ? 'warn' : ''}`}>
                {r.pct >= 0 ? '+' : ''}
                {fmt(r.pct, 1)} %
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="card accent stack">
        <h2>Empfehlung</h2>
        <p className="small">{advice}</p>
        <button className="btn" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0 }} onClick={() => start(bonus)}>
          Nächsten Zyklus starten
        </button>
      </div>
      {bonus === 1 ? (
        <button className="btn block" onClick={() => start(0)}>
          Lieber ohne Zusatzsatz starten
        </button>
      ) : (
        <button className="btn block" onClick={() => start(1)}>
          Trotzdem mehr Volumen (+1 Satz)
        </button>
      )}
    </div>
  )
}
