import { useState } from 'react'
import { MUSCLE_LABEL } from '../domain/exercises'
import type { CheckIn, Muscle } from '../domain/types'
import { today } from '../domain/util'
import { Sheet } from '../ui/kit'

const SCALE = ['Sehr schlecht', 'Schlecht', 'Okay', 'Gut', 'Sehr gut']
const SORE = ['Kein', 'Leicht', 'Deutlich', 'Stark']

export function CheckInSheet({ open, muscles, onClose, onDone }: { open: boolean; muscles: Muscle[]; onClose: () => void; onDone: (c: CheckIn | undefined) => void }) {
  const [sleep, setSleep] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [stress, setStress] = useState(3)
  const [soreness, setSoreness] = useState<Partial<Record<Muscle, number>>>({})

  return (
    <Sheet open={open} onClose={onClose} title="Wie fühlst du dich heute?">
      <div className="stack lg">
        <p className="muted small">Dein Check-in steuert die heutige Belastung: bei schlechtem Schlaf oder starkem Muskelkater nimmt die App Sätze und Intensität zurück.</p>
        <Scale label="Schlaf letzte Nacht" value={sleep} onChange={setSleep} />
        <Scale label="Energie" value={energy} onChange={setEnergy} />
        <Scale label="Stress" value={stress} onChange={setStress} labels={['Sehr niedrig', 'Niedrig', 'Mittel', 'Hoch', 'Sehr hoch']} />
        <div className="stack">
          <span className="label">Muskelkater in den heutigen Muskeln</span>
          <div className="card tight list">
            {muscles.map((m) => (
              <div key={m} className="row between" style={{ padding: '8px 0' }}>
                <span style={{ fontWeight: 600 }}>{MUSCLE_LABEL[m]}</span>
                <div className="row" style={{ gap: 4 }} role="group" aria-label={`Muskelkater ${MUSCLE_LABEL[m]}`}>
                  {SORE.map((l, i) => (
                    <button key={l} className="chip" style={{ minHeight: 34, padding: '0 10px', fontSize: '0.8rem' }} aria-pressed={(soreness[m] ?? 0) === i} onClick={() => setSoreness((s) => ({ ...s, [m]: i }))}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="btn primary block" onClick={() => onDone({ date: today(), sleep, energy, stress, soreness })}>
          Training starten
        </button>
        <button className="btn ghost block" onClick={() => onDone(undefined)}>
          Ohne Check-in starten
        </button>
      </div>
    </Sheet>
  )
}

function Scale({ label, value, onChange, labels = SCALE }: { label: string; value: number; onChange: (v: number) => void; labels?: string[] }) {
  return (
    <div className="stack">
      <div className="row between">
        <span className="label">{label}</span>
        <span className="small" style={{ fontWeight: 600 }}>
          {labels[value - 1]}
        </span>
      </div>
      <div className="grid3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }} role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className="chip" style={{ justifyContent: 'center', padding: 0 }} aria-pressed={value === n} aria-label={`${label}: ${labels[n - 1]}`} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
