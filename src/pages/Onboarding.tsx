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
    <div className="app">
      <div className="page" style={{ minHeight: '100dvh', paddingBottom: 'calc(24px + var(--safe-b))' }}>
        {step > 0 && (
          <div className="row" style={{ gap: 12 }}>
            <button className="icon-btn" onClick={back} aria-label={t('onboarding.back')}>
              <Icon name="back" />
            </button>
            <div className="bar grow" aria-label={t('onboarding.progress', { step, total: steps.length - 1 })}>
              <div style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {current === 'start' && (
          <div className="stack lg" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="eyebrow">Zyklus</div>
            <h1 style={{ fontSize: '2.4rem' }}>{t('onboarding.headline')}</h1>
            <p className="muted">{t('onboarding.intro')}</p>
            <LanguagePicker />
            <div className="field">
              <label htmlFor="name">{t('onboarding.nameLabel')}</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('onboarding.namePlaceholder')} autoComplete="given-name" />
            </div>
          </div>
        )}

        {current === 'ziel' && (
          <Step title={t('onboarding.qGoal')}>
            {GOALS.map((g) => (
              <button key={g.v} className="option" aria-pressed={goal === g.v} onClick={() => setGoal(g.v)}>
                <span className="emoji" aria-hidden="true">
                  {g.e}
                </span>
                <span className="stack" style={{ gap: 2 }}>
                  <strong>{tk(`onboarding.goal.${g.v}.t`)}</strong>
                  <span className="muted small">{tk(`onboarding.goal.${g.v}.d`)}</span>
                </span>
              </button>
            ))}
          </Step>
        )}

        {current === 'level' && (
          <Step title={t('onboarding.qLevel')}>
            {LEVELS.map((l) => (
              <button key={l} className="option" aria-pressed={level === l} onClick={() => setLevel(l)}>
                <span className="stack" style={{ gap: 2 }}>
                  <strong>{tk(`onboarding.level.${l}.t`)}</strong>
                  <span className="muted small">{tk(`onboarding.level.${l}.d`)}</span>
                </span>
              </button>
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
                <p className="muted small">{t('onboarding.homeHint')}</p>
                <div className="row wrap">
                  {HOME_EQUIPMENT_CHOICES.map((e) => (
                    <button key={e} className="chip" aria-pressed={homeEq.includes(e)} onClick={() => setHomeEq((x) => (x.includes(e) ? x.filter((y) => y !== e) : [...x, e]))}>
                      {tk(`labels.equipment.${e}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted small">{t('onboarding.gymHint')}</p>
            )}
          </Step>
        )}

        {current === 'tage' && (
          <Step title={t('onboarding.qDays')}>
            <div className="grid3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <button key={n} className="chip" style={{ justifyContent: 'center', minHeight: 56, fontSize: '1.2rem' }} aria-pressed={days === n} onClick={() => setDayCount(n)}>
                  {n}
                </button>
              ))}
            </div>
            <p className="label" style={{ marginTop: 8 }}>
              {t('onboarding.whichDays', { n: weekdays.length })}
            </p>
            <div className="week-strip">
              {weekdaysShort(lang).map((d, i) => (
                <button key={d} className="chip" style={{ justifyContent: 'center', padding: 0 }} aria-pressed={weekdays.includes(i)} onClick={() => toggleWeekday(i)}>
                  {d}
                </button>
              ))}
            </div>
            {weekdays.length !== days && <p className="small" style={{ color: 'var(--warn)' }}>{t('onboarding.pickExactly', { n: days })}</p>}
          </Step>
        )}

        {current === 'dauer' && (
          <Step title={t('onboarding.qDuration')}>
            {[30, 45, 60, 75, 90].map((m) => (
              <button key={m} className="option" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                <strong className="num" style={{ width: 70 }}>
                  {m} {t('common.min')}
                </strong>
                <span className="muted small">{m <= 45 ? t('onboarding.durShort') : m <= 60 ? t('onboarding.durMid') : t('onboarding.durLong')}</span>
              </button>
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
            <div className="card stack lg">
              <div className="stack">
                <span className="label">{t('onboarding.age')}</span>
                <Stepper label={t('onboarding.age')} value={age} onChange={setAge} min={14} max={90} suffix={t('onboarding.years')} />
              </div>
              <div className="stack">
                <span className="label">{t('onboarding.height')}</span>
                <Stepper label={t('onboarding.height')} value={height} onChange={setHeight} min={130} max={220} suffix="cm" />
              </div>
              <div className="stack">
                <span className="label">{t('onboarding.weight')}</span>
                <Stepper label={t('onboarding.weight')} value={weight} onChange={setWeight} step={0.5} min={35} max={250} suffix="kg" />
              </div>
            </div>
          </Step>
        )}

        {current === 'alltag' && (
          <Step title={t('onboarding.qActivity')}>
            {ACTIVITY.map((a) => (
              <button key={a.v} className="option" aria-pressed={activity === a.v} onClick={() => setActivity(a.v)}>
                <span className="stack" style={{ gap: 2 }}>
                  <strong>{tk(`onboarding.activity.${a.k}.t`)}</strong>
                  <span className="muted small">{tk(`onboarding.activity.${a.k}.d`)}</span>
                </span>
              </button>
            ))}
          </Step>
        )}

        {current === 'fertig' && preview && (
          <Step title={name ? t('onboarding.yourPlanNamed', { name }) : t('onboarding.yourPlan')}>
            <div className="card accent stack">
              <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
                {t('onboarding.mesoWeeks', { weeks: preview.weeks })}
              </div>
              <h2>{splitName(preview)}</h2>
              <p className="small muted">{t('onboarding.mesoText', { build: preview.weeks - 1 })}</p>
            </div>
            <div className="card list">
              {preview.days.map((d) => (
                <div key={d.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <strong>{dayName(d)}</strong>
                    <p className="muted small">{t('onboarding.dayMeta', { n: d.slots.length, sets: d.slots.reduce((a, s) => a + s.sets, 0), focus: dayFocus(d) })}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card grid2">
              <div className="stat">
                <span className="v">{fmt(kcal.kcal)}</span>
                <span className="l">{t('onboarding.kcalPerDay')}</span>
              </div>
              <div className="stat">
                <span className="v">{kcal.protein} g</span>
                <span className="l">{t('onboarding.proteinPerDay')}</span>
              </div>
            </div>
          </Step>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          {current === 'fertig' ? (
            <button className="btn primary block" onClick={() => complete({ ...profile, createdAt: new Date(nowMs()).toISOString() })}>
              {t('onboarding.go')}
            </button>
          ) : (
            <button className="btn primary block" onClick={next} disabled={current === 'tage' && weekdays.length !== days}>
              {step === 0 ? t('onboarding.create') : t('onboarding.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="stack lg">
      <div className="stack">
        <h1>{title}</h1>
        {hint && <p className="muted small">{hint}</p>}
      </div>
      <div className="stack">{children}</div>
    </div>
  )
}
