import { useState } from 'react'
import type { CheckIn, Muscle } from '../domain/types'
import { today } from '../domain/util'
import { Sheet } from '../ui/kit'
import { useT } from '../i18n'


export function CheckInSheet({ open, muscles, onClose, onDone }: { open: boolean; muscles: Muscle[]; onClose: () => void; onDone: (c: CheckIn | undefined) => void }) {
  const [sleep, setSleep] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [stress, setStress] = useState(3)
  const [soreness, setSoreness] = useState<Partial<Record<Muscle, number>>>({})
  const { t, tk } = useT()
  const scale = t('today.checkin.scale').split(',')
  const sore = t('today.checkin.soreScale').split(',')

  return (
    <Sheet open={open} onClose={onClose} title={t('today.checkin.title')}>
      <div className="stack lg">
        <p className="muted small">{t('today.checkin.intro')}</p>
        <Scale label={t('today.checkin.sleep')} value={sleep} onChange={setSleep} labels={scale} />
        <Scale label={t('today.checkin.energy')} value={energy} onChange={setEnergy} labels={scale} />
        <Scale label={t('today.checkin.stress')} value={stress} onChange={setStress} labels={t('today.checkin.stressScale').split(',')} />
        <div className="stack">
          <span className="label">{t('today.checkin.sore')}</span>
          <div className="card tight list">
            {muscles.map((m) => (
              <div key={m} className="row between" style={{ padding: '8px 0' }}>
                <span style={{ fontWeight: 600 }}>{tk(`labels.muscle.${m}`)}</span>
                <div className="row" style={{ gap: 4 }} role="group" aria-label={t('today.checkin.soreFor', { muscle: tk(`labels.muscle.${m}`) })}>
                  {sore.map((l, i) => (
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
          {t('today.checkin.start')}
        </button>
        <button className="btn ghost block" onClick={() => onDone(undefined)}>
          {t('today.checkin.skip')}
        </button>
      </div>
    </Sheet>
  )
}

function Scale({ label, value, onChange, labels }: { label: string; value: number; onChange: (v: number) => void; labels: string[] }) {
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
