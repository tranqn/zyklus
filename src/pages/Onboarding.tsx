import { useMemo, useState } from 'react'
import { EQUIPMENT_LABEL, GYM_EQUIPMENT, HOME_EQUIPMENT_CHOICES } from '../domain/exercises'
import { targets } from '../domain/nutrition'
import { generateMesocycle } from '../domain/planner'
import type { Equipment, Goal, Level, Location, Profile, Sex } from '../domain/types'
import { WEEKDAYS_SHORT } from '../domain/util'
import { useStore } from '../store'
import { Icon, Segmented, Stepper } from '../ui/kit'

const GOALS: { v: Goal; e: string; t: string; d: string }[] = [
  { v: 'muskelaufbau', e: '💪', t: 'Muskelaufbau', d: 'Mehr Muskelmasse mit leichtem Kalorienüberschuss' },
  { v: 'fettabbau', e: '🔥', t: 'Fett verlieren', d: 'Körperfett reduzieren, Muskeln erhalten' },
  { v: 'rekomposition', e: '⚖️', t: 'Body Recomposition', d: 'Gleichzeitig straffer und stärker werden' },
  { v: 'kraft', e: '🏋️', t: 'Maximalkraft', d: 'Schwerer heben in den Grundübungen' },
]

const LEVELS: { v: Level; t: string; d: string }[] = [
  { v: 'anfaenger', t: 'Einsteiger', d: 'Unter 1 Jahr regelmäßiges Krafttraining' },
  { v: 'fortgeschritten', t: 'Fortgeschritten', d: '1 bis 3 Jahre, Grundübungen sitzen' },
  { v: 'profi', t: 'Sehr erfahren', d: 'Über 3 Jahre, strukturiertes Training gewohnt' },
]

const ACTIVITY: { v: number; t: string; d: string }[] = [
  { v: 1.2, t: 'Überwiegend sitzend', d: 'Büro, wenig Bewegung im Alltag' },
  { v: 1.375, t: 'Leicht aktiv', d: 'Etwas zu Fuß oder mit dem Rad unterwegs' },
  { v: 1.5, t: 'Aktiv', d: 'Viel auf den Beinen, 8.000+ Schritte' },
  { v: 1.65, t: 'Sehr aktiv', d: 'Körperliche Arbeit' },
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
      createdAt: new Date().toISOString(),
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
            <button className="icon-btn" onClick={back} aria-label="Zurück">
              <Icon name="back" />
            </button>
            <div className="bar grow" aria-label={`Schritt ${step} von ${steps.length - 1}`}>
              <div style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {current === 'start' && (
          <div className="stack lg" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="eyebrow">Zyklus</div>
            <h1 style={{ fontSize: '2.4rem' }}>Dein Trainingsplan, der mitdenkt.</h1>
            <p className="muted">
              Ein paar Fragen, dann bekommst du einen Plan mit Mesozyklen, Krafttests, automatischer Progression und Kalorienzielen. Alles bleibt auf deinem Gerät.
            </p>
            <div className="field">
              <label htmlFor="name">Wie dürfen wir dich nennen? (optional)</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname" autoComplete="given-name" />
            </div>
          </div>
        )}

        {current === 'ziel' && (
          <Step title="Was ist dein Hauptziel?">
            {GOALS.map((g) => (
              <button key={g.v} className="option" aria-pressed={goal === g.v} onClick={() => setGoal(g.v)}>
                <span className="emoji" aria-hidden="true">
                  {g.e}
                </span>
                <span className="stack" style={{ gap: 2 }}>
                  <strong>{g.t}</strong>
                  <span className="muted small">{g.d}</span>
                </span>
              </button>
            ))}
          </Step>
        )}

        {current === 'level' && (
          <Step title="Wie viel Trainingserfahrung hast du?">
            {LEVELS.map((l) => (
              <button key={l.v} className="option" aria-pressed={level === l.v} onClick={() => setLevel(l.v)}>
                <span className="stack" style={{ gap: 2 }}>
                  <strong>{l.t}</strong>
                  <span className="muted small">{l.d}</span>
                </span>
              </button>
            ))}
          </Step>
        )}

        {current === 'ort' && (
          <Step title="Wo trainierst du?">
            <Segmented
              value={location}
              onChange={setLocation}
              label="Trainingsort"
              options={[
                { value: 'studio', label: 'Fitnessstudio' },
                { value: 'zuhause', label: 'Zuhause' },
              ]}
            />
            {location === 'zuhause' ? (
              <>
                <p className="muted small">Was hast du zuhause? Körpergewicht geht immer.</p>
                <div className="row wrap">
                  {HOME_EQUIPMENT_CHOICES.map((e) => (
                    <button key={e} className="chip" aria-pressed={homeEq.includes(e)} onClick={() => setHomeEq((x) => (x.includes(e) ? x.filter((y) => y !== e) : [...x, e]))}>
                      {EQUIPMENT_LABEL[e]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted small">Wir gehen von einem normal ausgestatteten Studio aus: Hanteln, Kabelzüge und Maschinen.</p>
            )}
          </Step>
        )}

        {current === 'tage' && (
          <Step title="Wie oft pro Woche willst du trainieren?">
            <div className="grid3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <button key={n} className="chip" style={{ justifyContent: 'center', minHeight: 56, fontSize: '1.2rem' }} aria-pressed={days === n} onClick={() => setDayCount(n)}>
                  {n}
                </button>
              ))}
            </div>
            <p className="label" style={{ marginTop: 8 }}>
              An welchen Tagen? ({weekdays.length} gewählt)
            </p>
            <div className="week-strip">
              {WEEKDAYS_SHORT.map((d, i) => (
                <button key={d} className="chip" style={{ justifyContent: 'center', padding: 0 }} aria-pressed={weekdays.includes(i)} onClick={() => toggleWeekday(i)}>
                  {d}
                </button>
              ))}
            </div>
            {weekdays.length !== days && <p className="small" style={{ color: 'var(--warn)' }}>Wähle genau {days} Tage, damit Plan und Kalender zusammenpassen.</p>}
          </Step>
        )}

        {current === 'dauer' && (
          <Step title="Wie lange darf ein Training dauern?">
            {[30, 45, 60, 75, 90].map((m) => (
              <button key={m} className="option" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                <strong className="num" style={{ width: 70 }}>
                  {m} min
                </strong>
                <span className="muted small">{m <= 45 ? 'Kompakt, mit Supersätzen' : m <= 60 ? 'Ausgewogen' : 'Mehr Volumen pro Einheit'}</span>
              </button>
            ))}
          </Step>
        )}

        {current === 'koerper' && (
          <Step title="Ein paar Körperdaten" hint="Für Kalorienbedarf und Startgewichte. Bleibt lokal auf deinem Gerät.">
            <Segmented
              value={sex}
              onChange={setSex}
              label="Geschlecht"
              options={[
                { value: 'm', label: 'Männlich' },
                { value: 'w', label: 'Weiblich' },
              ]}
            />
            <div className="card stack lg">
              <div className="stack">
                <span className="label">Alter</span>
                <Stepper label="Alter" value={age} onChange={setAge} min={14} max={90} suffix="Jahre" />
              </div>
              <div className="stack">
                <span className="label">Größe</span>
                <Stepper label="Größe" value={height} onChange={setHeight} min={130} max={220} suffix="cm" />
              </div>
              <div className="stack">
                <span className="label">Gewicht</span>
                <Stepper label="Gewicht" value={weight} onChange={setWeight} step={0.5} min={35} max={250} suffix="kg" />
              </div>
            </div>
          </Step>
        )}

        {current === 'alltag' && (
          <Step title="Wie aktiv ist dein Alltag (ohne Training)?">
            {ACTIVITY.map((a) => (
              <button key={a.v} className="option" aria-pressed={activity === a.v} onClick={() => setActivity(a.v)}>
                <span className="stack" style={{ gap: 2 }}>
                  <strong>{a.t}</strong>
                  <span className="muted small">{a.d}</span>
                </span>
              </button>
            ))}
          </Step>
        )}

        {current === 'fertig' && preview && (
          <Step title={`Dein Plan${name ? `, ${name}` : ''}`}>
            <div className="card accent stack">
              <div className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
                Mesozyklus 1 · {preview.weeks} Wochen
              </div>
              <h2>{preview.split}</h2>
              <p className="small muted">
                {preview.weeks - 1} Aufbauwochen mit steigender Intensität, danach eine Deload-Woche zur Erholung. Die erste Einheit pro Übung ist ein Krafttest.
              </p>
            </div>
            <div className="card list">
              {preview.days.map((d) => (
                <div key={d.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <strong>{d.name}</strong>
                    <p className="muted small">
                      {d.slots.length} Übungen · {d.slots.reduce((a, s) => a + s.sets, 0)} Sätze · {d.focus}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card grid2">
              <div className="stat">
                <span className="v">{kcal.kcal.toLocaleString('de-DE')}</span>
                <span className="l">kcal pro Tag</span>
              </div>
              <div className="stat">
                <span className="v">{kcal.protein} g</span>
                <span className="l">Protein pro Tag</span>
              </div>
            </div>
          </Step>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          {current === 'fertig' ? (
            <button className="btn primary block" onClick={() => complete(profile)}>
              Los geht's
            </button>
          ) : (
            <button className="btn primary block" onClick={next} disabled={current === 'tage' && weekdays.length !== days}>
              {step === 0 ? 'Plan erstellen' : 'Weiter'}
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
