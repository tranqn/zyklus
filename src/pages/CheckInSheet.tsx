import { useState } from 'react'
import type { CheckIn, Muscle } from '../domain/types'
import { today } from '../domain/util'
import { Sheet } from '../ui/kit'
import { useT } from '../i18n'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'


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
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-[0.85rem]">{t('today.checkin.intro')}</p>
        <Scale label={t('today.checkin.sleep')} value={sleep} onChange={setSleep} labels={scale} />
        <Scale label={t('today.checkin.energy')} value={energy} onChange={setEnergy} labels={scale} />
        <Scale label={t('today.checkin.stress')} value={stress} onChange={setStress} labels={t('today.checkin.stressScale').split(',')} />
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('today.checkin.sore')}</span>
          <Card className="p-3 flex flex-col divide-y divide-border">
            {muscles.map((m) => (
              <div key={m} className="flex items-center justify-between gap-2" style={{ padding: '8px 0' }}>
                <span style={{ fontWeight: 600 }}>{tk(`labels.muscle.${m}`)}</span>
                <div className="flex items-center gap-2" style={{ gap: 4 }} role="group" aria-label={t('today.checkin.soreFor', { muscle: tk(`labels.muscle.${m}`) })}>
                  {sore.map((l, i) => (
                    <Button variant="chip" key={l} style={{ minHeight: 34, padding: '0 10px', fontSize: '0.8rem' }} aria-pressed={(soreness[m] ?? 0) === i} onClick={() => setSoreness((s) => ({ ...s, [m]: i }))}>
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>
        <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => onDone({ date: today(), sleep, energy, stress, soreness })}>
          {t('today.checkin.start')}
        </Button>
        <Button variant="ghost" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => onDone(undefined)}>
          {t('today.checkin.skip')}
        </Button>
      </div>
    </Sheet>
  )
}

function Scale({ label, value, onChange, labels }: { label: string; value: number; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.85rem] font-semibold text-muted-foreground">{label}</span>
        <span className="text-[0.85rem]" style={{ fontWeight: 600 }}>
          {labels[value - 1]}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }} role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Button variant="chip" key={n} style={{ justifyContent: 'center', padding: 0 }} aria-pressed={value === n} aria-label={`${label}: ${labels[n - 1]}`} onClick={() => onChange(n)}>
            {n}
          </Button>
        ))}
      </div>
    </div>
  )
}
