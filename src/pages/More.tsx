import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CARDIO, cardioKcal, MOBILITY, routineSeconds, type MobilityRoutine } from '../domain/activities'
import { MOBILITY_ANIMATION } from '../domain/animations'
import { ExerciseAnimation } from '../ui/ExerciseAnimation'
import { allExercises, useStore } from '../store'
import { useSync } from '../sync/engine'
import { t as tr, tk as tkr, tx, useT, weekdaysShort } from '../i18n'
import { exerciseName } from '../i18n/content/exercises'
import { LanguagePicker } from '../ui/LanguagePicker'
import { useFlames } from '../ui/useFlames'
import { GYM_EQUIPMENT, HOME_EQUIPMENT_CHOICES } from '../domain/exercises'
import { targets, tdee } from '../domain/nutrition'
import type { Equipment, Goal, Level } from '../domain/types'
import { fmt, formatDate, nowMs, today } from '../domain/util'
import { Icon, Segmented, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input, NativeSelect } from '@/components/ui/input'

export default function More() {
  const mode = useStore((s) => s.settings.mode)
  const user = useSync((s) => s.user)
  const { t } = useT()
  const flames = useFlames()
  const items = [
    { to: '/konto', icon: 'heart', t: t('more.menu.account'), d: `${user?.email ?? ''}${user && !user.verified ? t('more.menu.unverified') : ''}` },
    { to: '/erfolge', icon: 'flame', t: t('motivation.title'), d: t('motivation.menuD', { d: flames.daily.count, w: flames.weekly.count }) },
    { to: '/freunde', icon: 'users', t: t('social.title'), d: t('social.menuD') },
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
      <Card className="flex flex-col divide-y divide-border" style={{ padding: '0 16px' }}>
        {items.map((i) => (
          <Link key={i.to} to={i.to} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className={buttonVariants({ variant: 'secondary', size: 'icon' })} aria-hidden="true">
              <Icon name={i.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <strong>{i.t}</strong>
              <span className="text-[0.85rem] text-muted-foreground" style={{ display: 'block' }}>
                {i.d}
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
        ))}
      </Card>
    </div>
  )
}

function SubPage({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  const nav = useNavigate()
  // re-render the whole sub page when the language changes
  useT()
  return (
    <div className="page">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={() => nav(-1)} aria-label={tr('common.back')}>
          <Icon name="back" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
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
      <p className="text-muted-foreground text-[0.85rem]">{tr('more.mobility.intro')}</p>
      <div className="flex flex-col gap-2">
        {MOBILITY.map((r) => (
          <button key={r.id} className="glass-card rounded-[var(--radius)] p-4 text-card-foreground flex items-center gap-2" style={{ textAlign: 'left' }} onClick={() => setRoutine(r)}>
            <span className="min-w-0 flex-1">
              <strong>{tx(r.name)}</strong>
              <span className="text-[0.85rem] text-muted-foreground" style={{ display: 'block' }}>
                {tr('more.mobility.meta', { focus: tx(r.focus), min: Math.round(routineSeconds(r) / 60), n: r.moves.length })}
              </span>
            </span>
            <span className={buttonVariants({ variant: 'secondary', size: 'icon' })} aria-hidden="true">
              <Icon name="play" size={18} />
            </span>
          </button>
        ))}
      </div>
      {done.length > 0 && (
        <Card className="flex flex-col gap-2" style={{ gap: 0 }}>
          <h3 style={{ marginBottom: 6 }}>{tr('more.mobility.recent')}</h3>
          <div className="flex flex-col divide-y divide-border">
            {done.map((m) => (
              <div key={m.id} className="list-row text-[0.85rem]">
                <span className="min-w-0 flex-1">{tx(MOBILITY.find((r) => r.id === m.routineId)?.name)}</span>
                <span className="text-muted-foreground">
                  {tr('more.mobility.recentMeta', { date: formatDate(m.date), min: m.minutes })}
                </span>
              </div>
            ))}
          </div>
        </Card>
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
        <div className="flex flex-col gap-4" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }} aria-hidden="true">
            🧘
          </div>
          <h2>{tr('more.mobility.done')}</h2>
          <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={save}>
            {tr('common.save')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4" style={{ textAlign: 'center' }}>
          <span className="eyebrow">
            {tr('more.mobility.step', { n: i + 1, total: steps.length })}
          </span>
          <h2 style={{ fontSize: '1.5rem' }}>{tx(step.name)}</h2>
          {step.side && <Badge variant="accent" style={{ alignSelf: 'center' }}>{step.side}</Badge>}
          {MOBILITY_ANIMATION[step.name.de] && <ExerciseAnimation key={MOBILITY_ANIMATION[step.name.de]} pattern={MOBILITY_ANIMATION[step.name.de]} label={tx(step.name)} size={220} />}
          <div className="tabular-nums" style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1 }} aria-live="polite">
            {left}
          </div>
          <p className="text-muted-foreground">{tx(step.cue)}</p>
          <div className="bar">
            <div style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary"
              className="min-w-0 flex-1"
              onClick={() => i > 0 && goTo(i - 1)}
            >
              {tr('common.back')}
            </Button>
            <Button className="min-w-0 flex-1" onClick={() => setPaused(!paused)}>
              <Icon name={paused ? 'play' : 'pause'} size={18} /> {paused ? tr('more.mobility.resume') : tr('more.mobility.pause')}
            </Button>
            <Button variant="secondary" className="min-w-0 flex-1" onClick={() => goTo(i + 1)}>
              {tr('more.mobility.next')}
            </Button>
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
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="act">{tr('more.cardio.activity')}</label>
          <NativeSelect id="act" value={activity} onChange={(e) => setActivity(e.target.value)}>
            {CARDIO.map((a) => (
              <option key={a.id} value={a.id}>
                {tx(a.name)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.cardio.duration')}</span>
          <Stepper label={tr('more.cardio.duration')} value={minutes} onChange={setMinutes} step={5} min={5} max={300} suffix="min" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.cardio.intensity')}</span>
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
        <p className="text-[0.85rem] text-muted-foreground">{tr('more.cardio.burned', { kcal })}</p>
        <Button
          className="w-full whitespace-normal text-center leading-tight py-2.5"
          onClick={() => {
            s.addCardio({ date: today(), activityId: activity, minutes, intensity, kcal })
            toast(tr('more.cardio.saved'))
          }}
        >
          {tr('more.cardio.log')}
        </Button>
      </Card>
      {recent.length > 0 && (
        <Card className="flex flex-col divide-y divide-border" style={{ padding: '0 16px' }}>
          {recent.map((c) => (
            <div key={c.id} className="list-row">
              <span className="min-w-0 flex-1">
                <strong>{tx(CARDIO.find((a) => a.id === c.activityId)?.name)}</strong>
                <span className="text-[0.85rem] text-muted-foreground" style={{ display: 'block' }}>
                  {tr('more.cardio.meta', { date: formatDate(c.date), min: c.minutes, kcal: c.kcal })}
                </span>
              </span>
              <Button variant="ghost" size="icon" aria-label={tr('common.delete')} onClick={() => s.removeCardio(c.id)}>
                <Icon name="trash" size={18} />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </SubPage>
  )
}

export function ModePage() {
  const s = useStore()
  const mode = s.settings.mode
  return (
    <SubPage title={tr('more.mode.title')} eyebrow={tr('more.mode.eyebrow')}>
      <p className="text-muted-foreground text-[0.85rem]">{tr('more.mode.intro')}</p>
      {(['normal', 'urlaub', 'krank'] as const).map((m) => (
        <Button variant="option" key={m} aria-pressed={mode === m} onClick={() => (s.setMode(m), toast(m === 'normal' ? tr('more.mode.welcomeBack') : tr('more.mode.pauseOn')))}>
          <span className="emoji" aria-hidden="true">
            {m === 'normal' ? '💪' : m === 'urlaub' ? '🏖️' : '🤒'}
          </span>
          <span className="flex flex-col gap-2" style={{ gap: 2 }}>
            <strong>{m === 'normal' ? tr('more.mode.normal') : m === 'urlaub' ? tr('more.mode.vacation') : tr('more.mode.sick')}</strong>
            <span className="text-[0.85rem] text-muted-foreground">{m === 'normal' ? tr('more.mode.normalD') : m === 'urlaub' ? tr('more.mode.vacationD') : tr('more.mode.sickD')}</span>
          </span>
        </Button>
      ))}
      {mode !== 'normal' && s.settings.modeSince && <p className="text-[0.85rem] text-muted-foreground">{tr('more.mode.since', { date: formatDate(s.settings.modeSince, { day: 'numeric', month: 'long' }) })}</p>}
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
        <Card style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <p className="text-[0.85rem]" style={{ marginBottom: 8 }}>
            {tr('more.settings.regenAsk')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRegen(false)}>
              {tr('common.later')}
            </Button>
            <Button size="sm"
             
              onClick={() => {
                s.regeneratePlan()
                setRegen(false)
                toast(tr('more.settings.regenDone'))
              }}
            >
              {tr('more.settings.regenNow')}
            </Button>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <h3>{tr('more.settings.training')}</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal">{tr('more.settings.goal')}</label>
          <NativeSelect id="goal" value={p.goal} onChange={(e) => upd({ goal: e.target.value as Goal })}>
            {(['muskelaufbau', 'fettabbau', 'rekomposition', 'kraft'] as const).map((g) => (
              <option key={g} value={g}>
                {tkr(`onboarding.goal.${g}.t`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="level">{tr('more.settings.level')}</label>
          <NativeSelect id="level" value={p.level} onChange={(e) => upd({ level: e.target.value as Level })}>
            {(['anfaenger', 'fortgeschritten', 'profi'] as const).map((l) => (
              <option key={l} value={l}>
                {tkr(`onboarding.level.${l}.t`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.trainingDays', { n: p.trainingDays.length })}</span>
          <div className="week-strip">
            {weekdaysShort().map((d, i) => (
              <Button variant="chip"
                key={d}
               
                style={{ justifyContent: 'center', padding: 0 }}
                aria-pressed={p.trainingDays.includes(i)}
                onClick={() => {
                  const days = p.trainingDays.includes(i) ? p.trainingDays.filter((x) => x !== i) : [...p.trainingDays, i].sort()
                  if (days.length < 2 || days.length > 6) return toast(tr('more.settings.daysRange'))
                  upd({ trainingDays: days, daysPerWeek: days.length })
                }}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.duration')}</span>
          <Stepper label={tr('more.settings.durationLabel')} value={p.sessionMinutes} onChange={(v) => upd({ sessionMinutes: v })} step={15} min={30} max={120} suffix="min" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.place')}</span>
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
            <div className="flex items-center flex-wrap gap-2">
              {HOME_EQUIPMENT_CHOICES.map((e: Equipment) => (
                <Button variant="chip" key={e} aria-pressed={p.equipment.includes(e)} onClick={() => upd({ equipment: p.equipment.includes(e) ? p.equipment.filter((x) => x !== e) : [...p.equipment, e] })}>
                  {tkr(`labels.equipment.${e}`)}
                </Button>
              ))}
            </div>
          )}
        </div>
        {s.settings.excludedExercises.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.excluded')}</span>
            <div className="flex items-center flex-wrap gap-2">
              {s.settings.excludedExercises.map((id) => (
                <Button variant="chip" key={id} onClick={() => s.updateSettings({ excludedExercises: s.settings.excludedExercises.filter((x) => x !== id) })}>
                  {(() => {
                    const e = allExercises(s).find((x) => x.id === id)
                    return e ? exerciseName(e) : id
                  })()}{' '}
                  <Icon name="close" size={14} />
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3>{tr('more.settings.body')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.age')}</span>
            <Stepper label={tr('more.settings.age')} value={p.age} onChange={(v) => upd({ age: v }, false)} min={14} max={90} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.height')}</span>
            <Stepper label={tr('more.settings.heightLabel')} value={p.heightCm} onChange={(v) => upd({ heightCm: v }, false)} min={130} max={220} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="act">{tr('more.settings.activity')}</label>
          <NativeSelect id="act" value={p.activity} onChange={(e) => upd({ activity: Number(e.target.value) }, false)}>
            {([[1.2, 'a1'], [1.375, 'a2'], [1.5, 'a3'], [1.65, 'a4']] as const).map(([v, k]) => (
              <option key={k} value={v}>
                {tkr(`onboarding.activity.${k}.t`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <p className="text-[0.85rem] text-muted-foreground">{tr('more.settings.need', { tdee: fmt(Math.round(tdee(p))), kcal: fmt(goal.kcal), p: goal.protein, c: goal.carbs, f: goal.fat })}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kcal">{tr('more.settings.ownKcal')}</label>
          <Input
            id="kcal"
           
            inputMode="numeric"
            value={s.settings.kcalOverride ?? ''}
            onChange={(e) => s.updateSettings({ kcalOverride: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined })}
            placeholder={tr('more.settings.ownKcalPlaceholder')}
          />
        </div>
        {s.kcalAdjustment !== 0 && (
          <Button variant="secondary" size="sm" onClick={() => s.setKcalAdjustment(0)}>
            {tr('more.settings.resetSmart', { delta: `${s.kcalAdjustment > 0 ? '+' : ''}${s.kcalAdjustment}` })}
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3>{tr('more.settings.app')}</h3>
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.language')}</span>
          <LanguagePicker />
        </div>
        <Toggle label={tr('more.settings.warmups')} on={s.settings.warmupSets} onChange={(v) => s.updateSettings({ warmupSets: v })} />
        <Toggle label={tr('more.settings.sound')} on={s.settings.restTimerSound} onChange={(v) => s.updateSettings({ restTimerSound: v })} />
        <Toggle label={tr('more.settings.vibrate')} on={s.settings.restTimerVibrate} onChange={(v) => s.updateSettings({ restTimerVibrate: v })} />
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('more.settings.theme')}</span>
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
      </Card>

      <Card className="flex flex-col gap-2">
        <h3>{tr('more.settings.data')}</h3>
        <p className="text-[0.85rem] text-muted-foreground">{tr('more.settings.dataText')}</p>
        <Button variant="secondary" onClick={exportData}>
          {tr('more.settings.backup')}
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          {tr('more.settings.restore')}
        </Button>
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
        <Button variant="destructive" onClick={() => confirmAction(tr('more.settings.wipeConfirm')) && s.reset()}>
          {tr('more.settings.wipe')}
        </Button>
      </Card>
    </SubPage>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2" style={{ minHeight: 44 }}>
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
    </label>
  )
}

export function Knowledge() {
  const keys = ['meso', 'rir', 'test', 'double', 'checkin', 'kcal', 'micro', 'map'] as const
  const blocks = keys.map((k) => [tr(`more.knowledge.${k}`), tr(`more.knowledge.${k}T`)] as const)
  return (
    <SubPage title={tr('more.knowledge.title')} eyebrow={tr('more.knowledge.eyebrow')}>
      {blocks.map(([h, t]) => (
        <Card key={h} className="flex flex-col gap-2">
          <h3>{h}</h3>
          <p className="text-[0.85rem] text-muted-foreground">{t}</p>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">{tr('more.knowledge.disclaimer')}</p>
    </SubPage>
  )
}
