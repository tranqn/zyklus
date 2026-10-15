import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CARDIO, cardioKcal, MOBILITY, routineSeconds, type MobilityRoutine } from '../domain/activities'
import { allExercises, useStore } from '../store'
import { useSync } from '../sync/engine'
import { t as tr, tk as tkr, tx, useT, weekdaysShort } from '../i18n'
import { exerciseName } from '../i18n/content/exercises'
import { LanguagePicker } from '../ui/LanguagePicker'
import { GYM_EQUIPMENT, HOME_EQUIPMENT_CHOICES } from '../domain/exercises'
import { targets, tdee } from '../domain/nutrition'
import type { Equipment, Goal, Level } from '../domain/types'
import { fmt, formatDate, nowMs, today } from '../domain/util'
import { Icon, Segmented, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'

export default function More() {
  const mode = useStore((s) => s.settings.mode)
  const user = useSync((s) => s.user)
  const { t } = useT()
  const items = [
    { to: '/konto', icon: 'heart', t: t('more.menu.account'), d: `${user?.email ?? ''}${user && !user.verified ? t('more.menu.unverified') : ''}` },
    { to: '/mobility', icon: 'stretch', t: t('more.menu.mobility'), d: t('more.menu.mobilityD') },
    { to: '/cardio', icon: 'run', t: t('more.menu.cardio'), d: t('more.menu.cardioD') },
    { to: '/einstellungen', icon: 'settings', t: t('more.menu.settings'), d: t('more.menu.settingsD') },
    { to: '/modus', icon: 'moon', t: t('more.menu.mode'), d: mode === 'normal' ? t('more.menu.modeOff') : t('more.menu.modeOn') },
    { to: '/wissen', icon: 'info', t: t('more.menu.knowledge'), d: t('more.menu.knowledgeD') },
  ]
  return (
    <div className="page">
      <div className="page-head">
        <h1>{t('more.title')}</h1>
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
  // re-render the whole sub page when the language changes
  useT()
  return (
    <div className="page">
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label={tr('common.back')}>
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
    <SubPage title={tr('common.mobility')} eyebrow={tr('more.mobility.eyebrow')}>
      <p className="muted small">{tr('more.mobility.intro')}</p>
      <div className="stack">
        {MOBILITY.map((r) => (
          <button key={r.id} className="card row" style={{ textAlign: 'left' }} onClick={() => setRoutine(r)}>
            <span className="grow">
              <strong>{tx(r.name)}</strong>
              <span className="small muted" style={{ display: 'block' }}>
                {tr('more.mobility.meta', { focus: tx(r.focus), min: Math.round(routineSeconds(r) / 60), n: r.moves.length })}
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
          <h3 style={{ marginBottom: 6 }}>{tr('more.mobility.recent')}</h3>
          <div className="list">
            {done.map((m) => (
              <div key={m.id} className="list-item small">
                <span className="grow">{tx(MOBILITY.find((r) => r.id === m.routineId)?.name)}</span>
                <span className="muted">
                  {tr('more.mobility.recentMeta', { date: formatDate(m.date), min: m.minutes })}
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
  const steps = routine.moves.flatMap((m) => (m.sides ? [{ ...m, side: tr('more.mobility.left') }, { ...m, side: tr('more.mobility.right') }] : [{ ...m, side: '' }]))
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
    toast(tr('more.mobility.saved'))
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={tx(routine.name)}>
      {finished ? (
        <div className="stack lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }} aria-hidden="true">
            🧘
          </div>
          <h2>{tr('more.mobility.done')}</h2>
          <button className="btn primary block" onClick={save}>
            {tr('common.save')}
          </button>
        </div>
      ) : (
        <div className="stack lg" style={{ textAlign: 'center' }}>
          <span className="eyebrow">
            {tr('more.mobility.step', { n: i + 1, total: steps.length })}
          </span>
          <h2 style={{ fontSize: '1.5rem' }}>{tx(step.name)}</h2>
          {step.side && <span className="badge accent" style={{ alignSelf: 'center' }}>{step.side}</span>}
          <div className="num" style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1 }} aria-live="polite">
            {left}
          </div>
          <p className="muted">{tx(step.cue)}</p>
          <div className="bar">
            <div style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="row">
            <button
              className="btn grow"
              onClick={() => i > 0 && goTo(i - 1)}
            >
              {tr('common.back')}
            </button>
            <button className="btn primary grow" onClick={() => setPaused(!paused)}>
              <Icon name={paused ? 'play' : 'pause'} size={18} /> {paused ? tr('more.mobility.resume') : tr('more.mobility.pause')}
            </button>
            <button className="btn grow" onClick={() => goTo(i + 1)}>
              {tr('more.mobility.next')}
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
    <SubPage title={tr('common.cardio')} eyebrow={tr('more.cardio.eyebrow')}>
      <div className="card stack lg">
        <div className="field">
          <label htmlFor="act">{tr('more.cardio.activity')}</label>
          <select id="act" className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
            {CARDIO.map((a) => (
              <option key={a.id} value={a.id}>
                {tx(a.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="stack">
          <span className="label">{tr('more.cardio.duration')}</span>
          <Stepper label={tr('more.cardio.duration')} value={minutes} onChange={setMinutes} step={5} min={5} max={300} suffix="min" />
        </div>
        <div className="stack">
          <span className="label">{tr('more.cardio.intensity')}</span>
          <Segmented
            value={intensity}
            onChange={setIntensity}
            label={tr('more.cardio.intensity')}
            options={[
              { value: 1, label: tr('more.cardio.easy') },
              { value: 2, label: tr('more.cardio.medium') },
              { value: 3, label: tr('more.cardio.hard') },
            ]}
          />
        </div>
        <p className="small muted">{tr('more.cardio.burned', { kcal })}</p>
        <button
          className="btn primary block"
          onClick={() => {
            s.addCardio({ date: today(), activityId: activity, minutes, intensity, kcal })
            toast(tr('more.cardio.saved'))
          }}
        >
          {tr('more.cardio.log')}
        </button>
      </div>
      {recent.length > 0 && (
        <div className="card list" style={{ padding: '0 16px' }}>
          {recent.map((c) => (
            <div key={c.id} className="list-item">
              <span className="grow">
                <strong>{tx(CARDIO.find((a) => a.id === c.activityId)?.name)}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  {tr('more.cardio.meta', { date: formatDate(c.date), min: c.minutes, kcal: c.kcal })}
                </span>
              </span>
              <button className="icon-btn plain" aria-label={tr('common.delete')} onClick={() => s.removeCardio(c.id)}>
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
    <SubPage title={tr('more.mode.title')} eyebrow={tr('more.mode.eyebrow')}>
      <p className="muted small">{tr('more.mode.intro')}</p>
      {(['normal', 'urlaub', 'krank'] as const).map((m) => (
        <button key={m} className="option" aria-pressed={mode === m} onClick={() => (s.setMode(m), toast(m === 'normal' ? tr('more.mode.welcomeBack') : tr('more.mode.pauseOn')))}>
          <span className="emoji" aria-hidden="true">
            {m === 'normal' ? '💪' : m === 'urlaub' ? '🏖️' : '🤒'}
          </span>
          <span className="stack" style={{ gap: 2 }}>
            <strong>{m === 'normal' ? tr('more.mode.normal') : m === 'urlaub' ? tr('more.mode.vacation') : tr('more.mode.sick')}</strong>
            <span className="small muted">{m === 'normal' ? tr('more.mode.normalD') : m === 'urlaub' ? tr('more.mode.vacationD') : tr('more.mode.sickD')}</span>
          </span>
        </button>
      ))}
      {mode !== 'normal' && s.settings.modeSince && <p className="small muted">{tr('more.mode.since', { date: formatDate(s.settings.modeSince, { day: 'numeric', month: 'long' }) })}</p>}
    </SubPage>
  )
}

export function SettingsPage() {
  const s = useStore()
  const p = s.profile!
  const [regen, setRegen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const goal = targets(p, s.settings.kcalOverride, s.kcalAdjustment)
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
    <SubPage title={tr('more.settings.title')}>
      {regen && (
        <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <p className="small" style={{ marginBottom: 8 }}>
            {tr('more.settings.regenAsk')}
          </p>
          <div className="row">
            <button className="btn sm" onClick={() => setRegen(false)}>
              {tr('common.later')}
            </button>
            <button
              className="btn primary sm"
              onClick={() => {
                s.regeneratePlan()
                setRegen(false)
                toast(tr('more.settings.regenDone'))
              }}
            >
              {tr('more.settings.regenNow')}
            </button>
          </div>
        </div>
      )}

      <section className="card stack lg">
        <h3>{tr('more.settings.training')}</h3>
        <div className="field">
          <label htmlFor="goal">{tr('more.settings.goal')}</label>
          <select id="goal" className="input" value={p.goal} onChange={(e) => upd({ goal: e.target.value as Goal })}>
            {(['muskelaufbau', 'fettabbau', 'rekomposition', 'kraft'] as const).map((g) => (
              <option key={g} value={g}>
                {tkr(`onboarding.goal.${g}.t`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="level">{tr('more.settings.level')}</label>
          <select id="level" className="input" value={p.level} onChange={(e) => upd({ level: e.target.value as Level })}>
            {(['anfaenger', 'fortgeschritten', 'profi'] as const).map((l) => (
              <option key={l} value={l}>
                {tkr(`onboarding.level.${l}.t`)}
              </option>
            ))}
          </select>
        </div>
        <div className="stack">
          <span className="label">{tr('more.settings.trainingDays', { n: p.trainingDays.length })}</span>
          <div className="week-strip">
            {weekdaysShort().map((d, i) => (
              <button
                key={d}
                className="chip"
                style={{ justifyContent: 'center', padding: 0 }}
                aria-pressed={p.trainingDays.includes(i)}
                onClick={() => {
                  const days = p.trainingDays.includes(i) ? p.trainingDays.filter((x) => x !== i) : [...p.trainingDays, i].sort()
                  if (days.length < 2 || days.length > 6) return toast(tr('more.settings.daysRange'))
                  upd({ trainingDays: days, daysPerWeek: days.length })
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="stack">
          <span className="label">{tr('more.settings.duration')}</span>
          <Stepper label={tr('more.settings.durationLabel')} value={p.sessionMinutes} onChange={(v) => upd({ sessionMinutes: v })} step={15} min={30} max={120} suffix="min" />
        </div>
        <div className="stack">
          <span className="label">{tr('more.settings.place')}</span>
          <Segmented
            value={p.location}
            label={tr('more.settings.placeLabel')}
            onChange={(v) => upd({ location: v, equipment: v === 'studio' ? GYM_EQUIPMENT : ['koerpergewicht', 'kurzhantel'] })}
            options={[
              { value: 'studio', label: tr('more.settings.gym') },
              { value: 'zuhause', label: tr('more.settings.home') },
            ]}
          />
          {p.location === 'zuhause' && (
            <div className="row wrap">
              {HOME_EQUIPMENT_CHOICES.map((e: Equipment) => (
                <button key={e} className="chip" aria-pressed={p.equipment.includes(e)} onClick={() => upd({ equipment: p.equipment.includes(e) ? p.equipment.filter((x) => x !== e) : [...p.equipment, e] })}>
                  {tkr(`labels.equipment.${e}`)}
                </button>
              ))}
            </div>
          )}
        </div>
        {s.settings.excludedExercises.length > 0 && (
          <div className="stack">
            <span className="label">{tr('more.settings.excluded')}</span>
            <div className="row wrap">
              {s.settings.excludedExercises.map((id) => (
                <button key={id} className="chip" onClick={() => s.updateSettings({ excludedExercises: s.settings.excludedExercises.filter((x) => x !== id) })}>
                  {(() => {
                    const e = allExercises(s).find((x) => x.id === id)
                    return e ? exerciseName(e) : id
                  })()}{' '}
                  <Icon name="close" size={14} />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card stack lg">
        <h3>{tr('more.settings.body')}</h3>
        <div className="grid2">
          <div className="stack">
            <span className="label">{tr('more.settings.age')}</span>
            <Stepper label={tr('more.settings.age')} value={p.age} onChange={(v) => upd({ age: v }, false)} min={14} max={90} />
          </div>
          <div className="stack">
            <span className="label">{tr('more.settings.height')}</span>
            <Stepper label={tr('more.settings.heightLabel')} value={p.heightCm} onChange={(v) => upd({ heightCm: v }, false)} min={130} max={220} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="act">{tr('more.settings.activity')}</label>
          <select id="act" className="input" value={p.activity} onChange={(e) => upd({ activity: Number(e.target.value) }, false)}>
            {([[1.2, 'a1'], [1.375, 'a2'], [1.5, 'a3'], [1.65, 'a4']] as const).map(([v, k]) => (
              <option key={k} value={v}>
                {tkr(`onboarding.activity.${k}.t`)}
              </option>
            ))}
          </select>
        </div>
        <p className="small muted">{tr('more.settings.need', { tdee: fmt(Math.round(tdee(p))), kcal: fmt(goal.kcal), p: goal.protein, c: goal.carbs, f: goal.fat })}</p>
        <div className="field">
          <label htmlFor="kcal">{tr('more.settings.ownKcal')}</label>
          <input
            id="kcal"
            className="input"
            inputMode="numeric"
            value={s.settings.kcalOverride ?? ''}
            onChange={(e) => s.updateSettings({ kcalOverride: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined })}
            placeholder={tr('more.settings.ownKcalPlaceholder')}
          />
        </div>
        {s.kcalAdjustment !== 0 && (
          <button className="btn sm" onClick={() => s.setKcalAdjustment(0)}>
            {tr('more.settings.resetSmart', { delta: `${s.kcalAdjustment > 0 ? '+' : ''}${s.kcalAdjustment}` })}
          </button>
        )}
      </section>

      <section className="card stack lg">
        <h3>{tr('more.settings.app')}</h3>
        <div className="stack">
          <span className="label">{tr('more.settings.language')}</span>
          <LanguagePicker />
        </div>
        <Toggle label={tr('more.settings.warmups')} on={s.settings.warmupSets} onChange={(v) => s.updateSettings({ warmupSets: v })} />
        <Toggle label={tr('more.settings.sound')} on={s.settings.restTimerSound} onChange={(v) => s.updateSettings({ restTimerSound: v })} />
        <Toggle label={tr('more.settings.vibrate')} on={s.settings.restTimerVibrate} onChange={(v) => s.updateSettings({ restTimerVibrate: v })} />
        <div className="stack">
          <span className="label">{tr('more.settings.theme')}</span>
          <Segmented
            value={theme}
            onChange={applyTheme}
            label={tr('more.settings.theme')}
            options={[
              { value: 'auto', label: tr('more.settings.themeAuto') },
              { value: 'light', label: tr('more.settings.themeLight') },
              { value: 'dark', label: tr('more.settings.themeDark') },
            ]}
          />
        </div>
      </section>

      <section className="card stack">
        <h3>{tr('more.settings.data')}</h3>
        <p className="small muted">{tr('more.settings.dataText')}</p>
        <button className="btn" onClick={exportData}>
          {tr('more.settings.backup')}
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          {tr('more.settings.restore')}
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
              toast(tr('more.settings.restored'))
            } catch {
              toast(tr('more.settings.badBackup'))
            }
          }}
        />
        <button className="btn danger" onClick={() => confirmAction(tr('more.settings.wipeConfirm')) && s.reset()}>
          {tr('more.settings.wipe')}
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
  const keys = ['meso', 'rir', 'test', 'double', 'checkin', 'kcal', 'map'] as const
  const blocks = keys.map((k) => [tr(`more.knowledge.${k}`), tr(`more.knowledge.${k}T`)] as const)
  return (
    <SubPage title={tr('more.knowledge.title')} eyebrow={tr('more.knowledge.eyebrow')}>
      {blocks.map(([h, t]) => (
        <section key={h} className="card stack">
          <h3>{h}</h3>
          <p className="small muted">{t}</p>
        </section>
      ))}
      <p className="tiny muted">{tr('more.knowledge.disclaimer')}</p>
    </SubPage>
  )
}
