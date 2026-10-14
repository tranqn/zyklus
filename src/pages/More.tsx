import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CARDIO, cardioKcal, MOBILITY, routineSeconds, type MobilityRoutine } from '../domain/activities'
import { allExercises, useStore } from '../store'
import { EQUIPMENT_LABEL, GYM_EQUIPMENT, HOME_EQUIPMENT_CHOICES } from '../domain/exercises'
import { targets, tdee } from '../domain/nutrition'
import type { Equipment, Goal, Level } from '../domain/types'
import { formatDate, nowMs, today, WEEKDAYS_SHORT } from '../domain/util'
import { Icon, Segmented, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'

export default function More() {
  const mode = useStore((s) => s.settings.mode)
  const items = [
    { to: '/mobility', icon: 'stretch', t: 'Mobility', d: 'Geführte Routinen mit Timer' },
    { to: '/cardio', icon: 'run', t: 'Cardio', d: 'Ausdauer eintragen, Kalorien zählen' },
    { to: '/einstellungen', icon: 'settings', t: 'Profil und Einstellungen', d: 'Ziel, Trainingstage, Ausstattung, Daten' },
    { to: '/modus', icon: 'moon', t: 'Urlaubs- und Krankheitsmodus', d: mode === 'normal' ? 'Plan und Serie pausieren' : 'Gerade aktiv' },
    { to: '/wissen', icon: 'info', t: 'So funktioniert Zyklus', d: 'RIR, Mesozyklen, Progression' },
  ]
  return (
    <div className="page">
      <div className="page-head">
        <h1>Mehr</h1>
      </div>
      <div className="card list" style={{ padding: '0 16px' }}>
        {items.map((i) => (
          <Link key={i.to} to={i.to} className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="icon-btn" aria-hidden="true">
              <Icon name={i.icon} size={20} />
            </span>
            <span className="grow">
              <strong>{i.t}</strong>
              <span className="small muted" style={{ display: 'block' }}>
                {i.d}
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function SubPage({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="page">
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Zurück">
          <Icon name="back" />
        </button>
      </div>
      <div className="stack">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  )
}

export function Mobility() {
  const s = useStore()
  const [routine, setRoutine] = useState<MobilityRoutine | null>(null)
  const done = s.mobility.slice(-5).reverse()
  return (
    <SubPage title="Mobility" eyebrow="Beweglichkeit">
      <p className="muted small">Kurze Routinen für Haltung, Verletzungsprophylaxe und tiefere Bewegungen. Ideal an Ruhetagen oder nach dem Training.</p>
      <div className="stack">
        {MOBILITY.map((r) => (
          <button key={r.id} className="card row" style={{ textAlign: 'left' }} onClick={() => setRoutine(r)}>
            <span className="grow">
              <strong>{r.name}</strong>
              <span className="small muted" style={{ display: 'block' }}>
                {r.focus} · {Math.round(routineSeconds(r) / 60)} min · {r.moves.length} Übungen
              </span>
            </span>
            <span className="icon-btn" aria-hidden="true">
              <Icon name="play" size={18} />
            </span>
          </button>
        ))}
      </div>
      {done.length > 0 && (
        <div className="card stack" style={{ gap: 0 }}>
          <h3 style={{ marginBottom: 6 }}>Zuletzt</h3>
          <div className="list">
            {done.map((m) => (
              <div key={m.id} className="list-item small">
                <span className="grow">{MOBILITY.find((r) => r.id === m.routineId)?.name}</span>
                <span className="muted">
                  {formatDate(m.date)} · {m.minutes} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {routine && <MobilityPlayer routine={routine} onClose={() => setRoutine(null)} />}
    </SubPage>
  )
}

function MobilityPlayer({ routine, onClose }: { routine: MobilityRoutine; onClose: () => void }) {
  const addMobility = useStore((s) => s.addMobility)
  // flatten moves into timed steps (both sides become two steps)
  const steps = routine.moves.flatMap((m) => (m.sides ? [{ ...m, side: 'Links' }, { ...m, side: 'Rechts' }] : [{ ...m, side: '' }]))
  // one state object, so a tick can move to the next step atomically
  const [pos, setPos] = useState({ i: 0, left: steps[0].seconds, finished: false })
  const [paused, setPaused] = useState(false)
  const [started] = useState(() => nowMs())
  const { i, left, finished } = pos
  const goTo = (n: number) => {
    if ('vibrate' in navigator) navigator.vibrate(120)
    setPos(n >= steps.length ? { i, left: 0, finished: true } : { i: n, left: steps[n].seconds, finished: false })
  }
  useEffect(() => {
    if (paused || finished) return
    const id = window.setInterval(() => {
      setPos((p) => {
        if (p.left > 1) return { ...p, left: p.left - 1 }
        if ('vibrate' in navigator) navigator.vibrate(120)
        return p.i + 1 >= steps.length ? { ...p, left: 0, finished: true } : { i: p.i + 1, left: steps[p.i + 1].seconds, finished: false }
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [paused, finished, steps])
  const step = steps[i]
  const save = () => {
    addMobility({ date: today(), routineId: routine.id, minutes: Math.max(1, Math.round((nowMs() - started) / 60000)) })
    toast('Mobility gespeichert')
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={routine.name}>
      {finished ? (
        <div className="stack lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }} aria-hidden="true">
            🧘
          </div>
          <h2>Geschafft!</h2>
          <button className="btn primary block" onClick={save}>
            Speichern
          </button>
        </div>
      ) : (
        <div className="stack lg" style={{ textAlign: 'center' }}>
          <span className="eyebrow">
            Übung {i + 1} von {steps.length}
          </span>
          <h2 style={{ fontSize: '1.5rem' }}>{step.name}</h2>
          {step.side && <span className="badge accent" style={{ alignSelf: 'center' }}>{step.side}</span>}
          <div className="num" style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1 }} aria-live="polite">
            {left}
          </div>
          <p className="muted">{step.cue}</p>
          <div className="bar">
            <div style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="row">
            <button
              className="btn grow"
              onClick={() => i > 0 && goTo(i - 1)}
            >
              Zurück
            </button>
            <button className="btn primary grow" onClick={() => setPaused(!paused)}>
              <Icon name={paused ? 'play' : 'pause'} size={18} /> {paused ? 'Weiter' : 'Pause'}
            </button>
            <button className="btn grow" onClick={() => goTo(i + 1)}>
              Weiter
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

export function Cardio() {
  const s = useStore()
  const [activity, setActivity] = useState(CARDIO[0].id)
  const [minutes, setMinutes] = useState(30)
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2)
  const act = CARDIO.find((a) => a.id === activity)!
  const kcal = cardioKcal(act, intensity, minutes, s.profile!.weightKg)
  const recent = [...s.cardio].reverse().slice(0, 10)
  return (
    <SubPage title="Cardio" eyebrow="Ausdauer">
      <div className="card stack lg">
        <div className="field">
          <label htmlFor="act">Aktivität</label>
          <select id="act" className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
            {CARDIO.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="stack">
          <span className="label">Dauer</span>
          <Stepper label="Dauer" value={minutes} onChange={setMinutes} step={5} min={5} max={300} suffix="min" />
        </div>
        <div className="stack">
          <span className="label">Intensität</span>
          <Segmented
            value={intensity}
            onChange={setIntensity}
            label="Intensität"
            options={[
              { value: 1, label: 'Locker' },
              { value: 2, label: 'Mittel' },
              { value: 3, label: 'Intensiv' },
            ]}
          />
        </div>
        <p className="small muted">
          Ca. <strong className="num">{kcal} kcal</strong> verbraucht. Diese Kalorien werden deinem Tagesziel gutgeschrieben.
        </p>
        <button
          className="btn primary block"
          onClick={() => {
            s.addCardio({ date: today(), activityId: activity, minutes, intensity, kcal })
            toast('Cardio gespeichert')
          }}
        >
          Eintragen
        </button>
      </div>
      {recent.length > 0 && (
        <div className="card list" style={{ padding: '0 16px' }}>
          {recent.map((c) => (
            <div key={c.id} className="list-item">
              <span className="grow">
                <strong>{CARDIO.find((a) => a.id === c.activityId)?.name}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  {formatDate(c.date)} · {c.minutes} min · {c.kcal} kcal
                </span>
              </span>
              <button className="icon-btn plain" aria-label="Löschen" onClick={() => s.removeCardio(c.id)}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SubPage>
  )
}

export function ModePage() {
  const s = useStore()
  const mode = s.settings.mode
  return (
    <SubPage title="Pause-Modus" eyebrow="Urlaub und Krankheit">
      <p className="muted small">
        Im Pause-Modus wird dein Zyklus angehalten und deine Serie eingefroren. Nach der Rückkehr startest du mit einer leichteren Einheit (weniger Sätze, mehr Reserve, ca. 10 % weniger Gewicht).
      </p>
      {(['normal', 'urlaub', 'krank'] as const).map((m) => (
        <button key={m} className="option" aria-pressed={mode === m} onClick={() => (s.setMode(m), toast(m === 'normal' ? 'Willkommen zurück!' : 'Pause-Modus aktiv'))}>
          <span className="emoji" aria-hidden="true">
            {m === 'normal' ? '💪' : m === 'urlaub' ? '🏖️' : '🤒'}
          </span>
          <span className="stack" style={{ gap: 2 }}>
            <strong>{m === 'normal' ? 'Normales Training' : m === 'urlaub' ? 'Urlaubsmodus' : 'Krankheitsmodus'}</strong>
            <span className="small muted">{m === 'normal' ? 'Plan läuft weiter' : m === 'urlaub' ? 'Kein Studio, Serie bleibt erhalten' : 'Erst gesund werden, dann sanft zurück'}</span>
          </span>
        </button>
      ))}
      {mode !== 'normal' && s.settings.modeSince && <p className="small muted">Aktiv seit {formatDate(s.settings.modeSince, { day: 'numeric', month: 'long' })}.</p>}
    </SubPage>
  )
}

export function SettingsPage() {
  const s = useStore()
  const p = s.profile!
  const [regen, setRegen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const t = targets(p, s.settings.kcalOverride, s.kcalAdjustment)
  const upd = (patch: Parameters<typeof s.updateProfile>[0], planRelevant = true) => {
    s.updateProfile(patch)
    if (planRelevant) setRegen(true)
  }
  const exportData = () => {
    const state = useStore.getState()
    const data = Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== 'function'))
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `zyklus-sicherung-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('zyklus-theme') ?? 'auto'
    } catch {
      return 'auto'
    }
  })
  const applyTheme = (v: string) => {
    setTheme(v)
    try {
      localStorage.setItem('zyklus-theme', v)
    } catch {
      /* private mode */
    }
    if (v === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', v)
  }
  return (
    <SubPage title="Einstellungen">
      {regen && (
        <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <p className="small" style={{ marginBottom: 8 }}>
            Du hast planrelevante Angaben geändert. Plan jetzt neu erstellen?
          </p>
          <div className="row">
            <button className="btn sm" onClick={() => setRegen(false)}>
              Später
            </button>
            <button
              className="btn primary sm"
              onClick={() => {
                s.regeneratePlan()
                setRegen(false)
                toast('Plan neu erstellt')
              }}
            >
              Neu erstellen
            </button>
          </div>
        </div>
      )}

      <section className="card stack lg">
        <h3>Training</h3>
        <div className="field">
          <label htmlFor="goal">Ziel</label>
          <select id="goal" className="input" value={p.goal} onChange={(e) => upd({ goal: e.target.value as Goal })}>
            <option value="muskelaufbau">Muskelaufbau</option>
            <option value="fettabbau">Fett verlieren</option>
            <option value="rekomposition">Body Recomposition</option>
            <option value="kraft">Maximalkraft</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="level">Erfahrung</label>
          <select id="level" className="input" value={p.level} onChange={(e) => upd({ level: e.target.value as Level })}>
            <option value="anfaenger">Einsteiger</option>
            <option value="fortgeschritten">Fortgeschritten</option>
            <option value="profi">Sehr erfahren</option>
          </select>
        </div>
        <div className="stack">
          <span className="label">Trainingstage ({p.trainingDays.length} pro Woche)</span>
          <div className="week-strip">
            {WEEKDAYS_SHORT.map((d, i) => (
              <button
                key={d}
                className="chip"
                style={{ justifyContent: 'center', padding: 0 }}
                aria-pressed={p.trainingDays.includes(i)}
                onClick={() => {
                  const days = p.trainingDays.includes(i) ? p.trainingDays.filter((x) => x !== i) : [...p.trainingDays, i].sort()
                  if (days.length < 2 || days.length > 6) return toast('2 bis 6 Trainingstage')
                  upd({ trainingDays: days, daysPerWeek: days.length })
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="stack">
          <span className="label">Dauer pro Training</span>
          <Stepper label="Trainingsdauer" value={p.sessionMinutes} onChange={(v) => upd({ sessionMinutes: v })} step={15} min={30} max={120} suffix="min" />
        </div>
        <div className="stack">
          <span className="label">Ort</span>
          <Segmented
            value={p.location}
            label="Trainingsort"
            onChange={(v) => upd({ location: v, equipment: v === 'studio' ? GYM_EQUIPMENT : ['koerpergewicht', 'kurzhantel'] })}
            options={[
              { value: 'studio', label: 'Studio' },
              { value: 'zuhause', label: 'Zuhause' },
            ]}
          />
          {p.location === 'zuhause' && (
            <div className="row wrap">
              {HOME_EQUIPMENT_CHOICES.map((e: Equipment) => (
                <button key={e} className="chip" aria-pressed={p.equipment.includes(e)} onClick={() => upd({ equipment: p.equipment.includes(e) ? p.equipment.filter((x) => x !== e) : [...p.equipment, e] })}>
                  {EQUIPMENT_LABEL[e]}
                </button>
              ))}
            </div>
          )}
        </div>
        {s.settings.excludedExercises.length > 0 && (
          <div className="stack">
            <span className="label">Ausgeschlossene Übungen</span>
            <div className="row wrap">
              {s.settings.excludedExercises.map((id) => (
                <button key={id} className="chip" onClick={() => s.updateSettings({ excludedExercises: s.settings.excludedExercises.filter((x) => x !== id) })}>
                  {allExercises(s).find((e) => e.id === id)?.name ?? id} <Icon name="close" size={14} />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card stack lg">
        <h3>Körper und Ernährung</h3>
        <div className="grid2">
          <div className="stack">
            <span className="label">Alter</span>
            <Stepper label="Alter" value={p.age} onChange={(v) => upd({ age: v }, false)} min={14} max={90} />
          </div>
          <div className="stack">
            <span className="label">Größe (cm)</span>
            <Stepper label="Größe" value={p.heightCm} onChange={(v) => upd({ heightCm: v }, false)} min={130} max={220} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="act">Alltagsaktivität</label>
          <select id="act" className="input" value={p.activity} onChange={(e) => upd({ activity: Number(e.target.value) }, false)}>
            <option value={1.2}>Überwiegend sitzend</option>
            <option value={1.375}>Leicht aktiv</option>
            <option value={1.5}>Aktiv</option>
            <option value={1.65}>Sehr aktiv</option>
          </select>
        </div>
        <p className="small muted">
          Geschätzter Bedarf: <strong className="num">{Math.round(tdee(p)).toLocaleString('de-DE')} kcal</strong> · Dein Ziel: <strong className="num">{t.kcal.toLocaleString('de-DE')} kcal</strong> ({t.protein} g P, {t.carbs} g K, {t.fat} g F)
        </p>
        <div className="field">
          <label htmlFor="kcal">Eigenes Kalorienziel (leer = automatisch)</label>
          <input
            id="kcal"
            className="input"
            inputMode="numeric"
            value={s.settings.kcalOverride ?? ''}
            onChange={(e) => s.updateSettings({ kcalOverride: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined })}
            placeholder="z. B. 2400"
          />
        </div>
        {s.kcalAdjustment !== 0 && (
          <button className="btn sm" onClick={() => s.setKcalAdjustment(0)}>
            Smarte Anpassung zurücksetzen ({s.kcalAdjustment > 0 ? '+' : ''}
            {s.kcalAdjustment} kcal)
          </button>
        )}
      </section>

      <section className="card stack lg">
        <h3>App</h3>
        <Toggle label="Aufwärmsätze vorschlagen" on={s.settings.warmupSets} onChange={(v) => s.updateSettings({ warmupSets: v })} />
        <Toggle label="Ton am Ende der Satzpause" on={s.settings.restTimerSound} onChange={(v) => s.updateSettings({ restTimerSound: v })} />
        <Toggle label="Vibration am Ende der Satzpause" on={s.settings.restTimerVibrate} onChange={(v) => s.updateSettings({ restTimerVibrate: v })} />
        <div className="stack">
          <span className="label">Darstellung</span>
          <Segmented
            value={theme}
            onChange={applyTheme}
            label="Darstellung"
            options={[
              { value: 'auto', label: 'System' },
              { value: 'light', label: 'Hell' },
              { value: 'dark', label: 'Dunkel' },
            ]}
          />
        </div>
      </section>

      <section className="card stack">
        <h3>Deine Daten</h3>
        <p className="small muted">Alles wird nur auf diesem Gerät gespeichert. Sichere regelmäßig, besonders vor einem Gerätewechsel.</p>
        <button className="btn" onClick={exportData}>
          Sicherung herunterladen
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Sicherung wiederherstellen
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              s.importData(await f.text())
              toast('Sicherung wiederhergestellt')
            } catch {
              toast('Datei ist keine gültige Sicherung')
            }
          }}
        />
        <button className="btn danger" onClick={() => confirmAction('Wirklich alle Daten löschen? Das kann nicht rückgängig gemacht werden.') && s.reset()}>
          Alle Daten löschen
        </button>
      </section>
    </SubPage>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row between" style={{ minHeight: 44 }}>
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
    </label>
  )
}

export function Knowledge() {
  const blocks: [string, string][] = [
    ['Mesozyklus', 'Ein Trainingsblock von 5 bis 6 Wochen. Die Intensität steigt Woche für Woche, danach folgt eine Deload-Woche mit halbem Volumen. Nach jedem Zyklus wertet die App deinen Fortschritt aus und passt Volumen und Zusatzübungen an.'],
    ['RIR (Reps in Reserve)', 'Wie viele saubere Wiederholungen du am Satzende noch geschafft hättest. 2 RIR heißt: zwei wären noch gegangen. So trainierst du hart genug für Fortschritt, ohne ständig ans Versagen zu gehen.'],
    ['Krafttest', 'Bei einer neuen Übung ist der erste Satz ein Testsatz. Aus Gewicht, Wiederholungen und RIR schätzt die App dein Maximum (Epley-Formel) und berechnet daraus die Gewichte aller weiteren Sätze.'],
    ['Doppelte Progression', 'Erst steigen die Wiederholungen. Schaffst du in allen Sätzen das obere Ende des Bereichs, gibt es mehr Gewicht und du startest wieder unten im Bereich.'],
    ['Tagesform-Check-in', 'Schlaf, Energie, Stress und Muskelkater fließen in die Einheit ein. Bei deutlichem Muskelkater fällt ein Satz für den Muskel weg und die Reserve steigt. So vermeidest du Übertraining.'],
    ['Smarte Kalorien', 'Die App vergleicht deinen geglätteten Gewichtstrend mit dem Zieltempo (z. B. 0,6 % Körpergewicht pro Woche beim Abnehmen) und schlägt Korrekturen in kleinen Schritten vor.'],
    ['Muskel-Map', 'Zeigt die harten Sätze pro Muskel und Woche. Für Muskelaufbau gelten etwa 10 bis 20 Sätze pro Woche als guter Bereich.'],
  ]
  return (
    <SubPage title="So funktioniert Zyklus" eyebrow="Wissen">
      {blocks.map(([h, t]) => (
        <section key={h} className="card stack">
          <h3>{h}</h3>
          <p className="small muted">{t}</p>
        </section>
      ))}
      <p className="tiny muted">Hinweis: Zyklus ersetzt keine medizinische Beratung. Bei Schmerzen oder Vorerkrankungen sprich mit Ärztin, Arzt oder Physiotherapie.</p>
    </SubPage>
  )
}
