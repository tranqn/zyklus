import { useMemo, useState } from 'react'
import { GYM_EQUIPMENT, HOME_EQUIPMENT_CHOICES } from '../domain/exercises'
import { targets } from '../domain/nutrition'
import { generateMesocycle } from '../domain/planner'
import type { Equipment, Goal, Level, Location, Profile, Sex } from '../domain/types'
import { fmt, nowMs } from '../domain/util'
import { useStore } from '../store'
import { Icon, Segmented, Stepper } from '../ui/kit'
import { useT, weekdaysShort } from '../i18n'
import { dayFocus, dayName, splitName } from '../i18n/display'
import { LanguagePicker } from '../ui/LanguagePicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const GOALS: { v: Goal; e: string }[] = [
  { v: 'muskelaufbau', e: '💪' },
  { v: 'fettabbau', e: '🔥' },
  { v: 'rekomposition', e: '⚖️' },
  { v: 'kraft', e: '🏋️' },
]
const LEVELS: Level[] = ['anfaenger', 'fortgeschritten', 'profi']
const ACTIVITY: { v: number; k: 'a1' | 'a2' | 'a3' | 'a4' }[] = [
  { v: 1.2, k: 'a1' },
  { v: 1.375, k: 'a2' },
  { v: 1.5, k: 'a3' },
  { v: 1.65, k: 'a4' },
]

const DEFAULT_DAYS: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
}

export default function Onboarding() {
  const complete = useStore((s) => s.completeOnboarding)
  const { t, tk, lang } = useT()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<Goal>('muskelaufbau')
  const [level, setLevel] = useState<Level>('anfaenger')
  const [location, setLocation] = useState<Location>('studio')
  const [homeEq, setHomeEq] = useState<Equipment[]>(['kurzhantel', 'baender'])
  const [days, setDays] = useState(3)
  const [weekdays, setWeekdays] = useState<number[]>(DEFAULT_DAYS[3])
  const [minutes, setMinutes] = useState(60)
  const [sex, setSex] = useState<Sex>('m')
  const [age, setAge] = useState(28)
  const [height, setHeight] = useState(178)
  const [weight, setWeight] = useState(78)
  const [activity, setActivity] = useState(1.375)
  const [name, setName] = useState('')

  const profile: Profile = useMemo(
    () => ({
      name: name.trim(),
      sex,
      age,
      heightCm: height,
      weightKg: weight,
      activity,
      goal,
      level,
      location,
      equipment: location === 'studio' ? GYM_EQUIPMENT : ['koerpergewicht', ...homeEq],
      daysPerWeek: days,
      sessionMinutes: minutes,
      trainingDays: weekdays,
      createdAt: '',
    }),
    [name, sex, age, height, weight, activity, goal, level, location, homeEq, days, minutes, weekdays],
  )

  const steps = ['start', 'ziel', 'level', 'ort', 'tage', 'dauer', 'koerper', 'alltag', 'fertig'] as const
  const current = steps[step]
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const preview = useMemo(() => (current === 'fertig' ? generateMesocycle(profile) : null), [current, profile])
  const kcal = targets(profile)

  const setDayCount = (n: number) => {
    setDays(n)
    setWeekdays(DEFAULT_DAYS[n])
  }
  const toggleWeekday = (i: number) => {
    setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort()))
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[560px]">
      <div className="page" style={{ minHeight: '100dvh', paddingBottom: 'calc(24px + var(--safe-b))' }}>
        {step > 0 && (
          <div className="flex items-center gap-2" style={{ gap: 12 }}>
            <Button variant="secondary" size="icon" onClick={back} aria-label={t('onboarding.back')}>
              <Icon name="back" />
            </Button>
            <div className="bar min-w-0 flex-1" aria-label={t('onboarding.progress', { step, total: steps.length - 1 })}>
              <div style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {current === 'start' && (
          <div className="flex flex-col gap-4" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="eyebrow">Zyklus</div>
            <h1 style={{ fontSize: '2.4rem' }}>{t('onboarding.headline')}</h1>
            <p className="text-muted-foreground">{t('onboarding.intro')}</p>
            <LanguagePicker />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name">{t('onboarding.nameLabel')}</label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('onboarding.namePlaceholder')} autoComplete="given-name" />
            </div>
          </div>
        )}

        {current === 'ziel' && (
          <Step title={t('onboarding.qGoal')}>
            {GOALS.map((g) => (
              <Button variant="option" key={g.v} aria-pressed={goal === g.v} onClick={() => setGoal(g.v)}>
                <span className="emoji" aria-hidden="true">
                  {g.e}
                </span>
                <span className="flex flex-col gap-2" style={{ gap: 2 }}>
                  <strong>{tk(`onboarding.goal.${g.v}.t`)}</strong>
                  <span className="text-muted-foreground text-[0.85rem]">{tk(`onboarding.goal.${g.v}.d`)}</span>
                </span>
              </Button>
            ))}
          </Step>
        )}

        {current === 'level' && (
          <Step title={t('onboarding.qLevel')}>
            {LEVELS.map((l) => (
              <Button variant="option" key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>
                <span className="flex flex-col gap-2" style={{ gap: 2 }}>
                  <strong>{tk(`onboarding.level.${l}.t`)}</strong>
                  <span className="text-muted-foreground text-[0.85rem]">{tk(`onboarding.level.${l}.d`)}</span>
                </span>
              </Button>
            ))}
          </Step>
        )}

        {current === 'ort' && (
          <Step title={t('onboarding.qPlace')}>
            <Segmented
              value={location}
              onChange={setLocation}
              label={t('onboarding.place')}
              options={[
                { value: 'studio', label: t('onboarding.gym') },
                { value: 'zuhause', label: t('onboarding.home') },
              ]}
            />
            {location === 'zuhause' ? (
              <>
                <p className="text-muted-foreground text-[0.85rem]">{t('onboarding.homeHint')}</p>
                <div className="flex items-center flex-wrap gap-2">
                  {HOME_EQUIPMENT_CHOICES.map((e) => (
                    <Button variant="chip" key={e} aria-pressed={homeEq.includes(e)} onClick={() => setHomeEq((x) => (x.includes(e) ? x.filter((y) => y !== e) : [...x, e]))}>
                      {tk(`labels.equipment.${e}`)}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-[0.85rem]">{t('onboarding.gymHint')}</p>
            )}
          </Step>
        )}

        {current === 'tage' && (
          <Step title={t('onboarding.qDays')}>
            <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <Button variant="chip" key={n} style={{ justifyContent: 'center', minHeight: 56, fontSize: '1.2rem' }} aria-pressed={days === n} onClick={() => setDayCount(n)}>
                  {n}
                </Button>
              ))}
            </div>
            <p className="text-[0.85rem] font-semibold text-muted-foreground" style={{ marginTop: 8 }}>
              {t('onboarding.whichDays', { n: weekdays.length })}
            </p>
            <div className="week-strip">
              {weekdaysShort(lang).map((d, i) => (
                <Button variant="chip" key={d} style={{ justifyContent: 'center', padding: 0 }} aria-pressed={weekdays.includes(i)} onClick={() => toggleWeekday(i)}>
                  {d}
                </Button>
              ))}
            </div>
            {weekdays.length !== days && <p className="text-[0.85rem]" style={{ color: 'var(--warn)' }}>{t('onboarding.pickExactly', { n: days })}</p>}
          </Step>
        )}

        {current === 'dauer' && (
          <Step title={t('onboarding.qDuration')}>
            {[30, 45, 60, 75, 90].map((m) => (
              <Button variant="option" key={m} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                <strong className="tabular-nums" style={{ width: 70 }}>
                  {m} {t('common.min')}
                </strong>
                <span className="text-muted-foreground text-[0.85rem]">{m <= 45 ? t('onboarding.durShort') : m <= 60 ? t('onboarding.durMid') : t('onboarding.durLong')}</span>
              </Button>
            ))}
          </Step>
        )}

        {current === 'koerper' && (
          <Step title={t('onboarding.qBody')} hint={t('onboarding.bodyHint')}>
            <Segmented
              value={sex}
              onChange={setSex}
              label={t('onboarding.sex')}
              options={[
                { value: 'm', label: t('onboarding.male') },
                { value: 'w', label: t('onboarding.female') },
              ]}
            />
            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('onboarding.age')}</span>
                <Stepper label={t('onboarding.age')} value={age} onChange={setAge} min={14} max={90} suffix={t('onboarding.years')} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('onboarding.height')}</span>
                <Stepper label={t('onboarding.height')} value={height} onChange={setHeight} min={130} max={220} suffix="cm" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('onboarding.weight')}</span>
                <Stepper label={t('onboarding.weight')} value={weight} onChange={setWeight} step={0.5} min={35} max={250} suffix="kg" />
              </div>
            </Card>
          </Step>
        )}

        {current === 'alltag' && (
          <Step title={t('onboarding.qActivity')}>
            {ACTIVITY.map((a) => (
              <Button variant="option" key={a.v} aria-pressed={activity === a.v} onClick={() => setActivity(a.v)}>
                <span className="flex flex-col gap-2" style={{ gap: 2 }}>
                  <strong>{tk(`onboarding.activity.${a.k}.t`)}</strong>
                  <span className="text-muted-foreground text-[0.85rem]">{tk(`onboarding.activity.${a.k}.d`)}</span>
                </span>
              </Button>
            ))}
          </Step>
        )}

        {current === 'fertig' && preview && (
          <Step title={name ? t('onboarding.yourPlanNamed', { name }) : t('onboarding.yourPlan')}>
            <Card className="[--glass-fill:var(--accent-grad)] text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/80 flex flex-col gap-2">
              <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
                {t('onboarding.mesoWeeks', { weeks: preview.weeks })}
              </div>
              <h2>{splitName(preview)}</h2>
              <p className="text-[0.85rem] text-muted-foreground">{t('onboarding.mesoText', { build: preview.weeks - 1 })}</p>
            </Card>
            <Card className="flex flex-col divide-y divide-border">
              {preview.days.map((d) => (
                <div key={d.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div className="min-w-0 flex-1">
                    <strong>{dayName(d)}</strong>
                    <p className="text-muted-foreground text-[0.85rem]">{t('onboarding.dayMeta', { n: d.slots.length, sets: d.slots.reduce((a, s) => a + s.sets, 0), focus: dayFocus(d) })}</p>
                  </div>
                </div>
              ))}
            </Card>
            <Card className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[1.4rem] font-extrabold tabular-nums">{fmt(kcal.kcal)}</span>
                <span className="text-[0.78rem] font-semibold text-muted-foreground">{t('onboarding.kcalPerDay')}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[1.4rem] font-extrabold tabular-nums">{kcal.protein} g</span>
                <span className="text-[0.78rem] font-semibold text-muted-foreground">{t('onboarding.proteinPerDay')}</span>
              </div>
            </Card>
          </Step>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          {current === 'fertig' ? (
            <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => complete({ ...profile, createdAt: new Date(nowMs()).toISOString() })}>
              {t('onboarding.go')}
            </Button>
          ) : (
            <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={next} disabled={current === 'tage' && weekdays.length !== days}>
              {step === 0 ? t('onboarding.create') : t('onboarding.next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1>{title}</h1>
        {hint && <p className="text-muted-foreground text-[0.85rem]">{hint}</p>}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
