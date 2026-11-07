import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { hasEquipment } from '../domain/exercises'
import { prsInSession, sessionSets, sessionVolume } from '../domain/stats'
import type { Exercise, SessionExercise, SetEntry } from '../domain/types'
import { fmt, formatDate, isStaleSession, nowMs, sessionEndMs } from '../domain/util'
import { allExercises, exerciseMap, useStore } from '../store'
import { Icon, Sheet } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { ExerciseAnimation } from '../ui/ExerciseAnimation'
import { t as tr, useT } from '../i18n'
import { exerciseCues, exerciseName } from '../i18n/content/exercises'
import { noteText, sessionDayName } from '../i18n/display'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'

export default function Workout() {
  const s = useStore()
  const nav = useNavigate()
  const active = s.active
  const lib = useMemo(() => exerciseMap(s), [s])
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)
  const [swapKey, setSwapKey] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  // subscribe to the language so the whole screen re-renders on a switch
  useT()
  useWakeLock(!!active)
  const now = useNow(60_000)

  if (!active) return <Navigate to="/" replace />

  const totalWork = active.exercises.reduce((a, e) => a + e.sets.filter((x) => x.kind !== 'aufwaermen').length, 0)
  const doneWork = active.exercises.reduce((a, e) => a + e.sets.filter((x) => x.kind !== 'aufwaermen' && x.done).length, 0)
  // started hours or days ago and never finished: a running clock would only confuse
  const stale = isStaleSession(active.startedAt, now)
  const discard = () => {
    if (confirmAction(tr('workout.discardConfirm'))) {
      s.discardSession()
      nav('/')
    }
  }

  const onSetDone = (se: SessionExercise, idx: number) => {
    const set = se.sets[idx]
    if (set.done) {
      s.updateSet(se.key, idx, { done: false })
      return
    }
    const patch: Partial<SetEntry> = {
      done: true,
      weight: set.weight ?? set.targetWeight,
      reps: set.reps ?? set.targetReps,
      rir: set.rir ?? (set.kind === 'aufwaermen' ? undefined : set.targetRir),
    }
    const ex = lib.get(se.exerciseId)
    if (ex?.loadType === 'gewicht' && patch.weight == null && set.kind !== 'aufwaermen') {
      toast(tr('workout.weightFirst'))
      return
    }
    s.updateSet(se.key, idx, patch)
    // superset: rest only after the second exercise of the pair
    const partner = se.superset ? active.exercises.find((e) => e.superset === se.superset && e.key !== se.key) : undefined
    const partnerFirst = partner && active.exercises.indexOf(partner) > active.exercises.indexOf(se)
    const secs = set.kind === 'aufwaermen' ? 60 : partnerFirst ? 0 : se.restSec
    if (secs > 0) setRest({ end: nowMs() + secs * 1000, total: secs })
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(120px + var(--safe-b))' }}>
      <div className="flex items-center justify-between gap-2 sticky-bar" style={{ position: 'sticky', top: 0, zIndex: 10, margin: '-16px -16px 0', padding: 'calc(8px + var(--safe-t)) 16px 8px' }}>
        <Button variant="secondary" size="icon" onClick={() => nav('/')} aria-label={tr('workout.backOverview')}>
          <Icon name="back" />
        </Button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{sessionDayName(active)}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {stale ? tr('workout.openSince', { date: formatDate(active.date) }) : <>{tr('workout.duration')} <Elapsed since={active.startedAt} /></>} · {tr('workout.setsDone', { done: doneWork, total: totalWork })}
          </div>
        </div>
        <Button size="sm" onClick={() => setFinishOpen(true)}>
          {tr('workout.finish')}
        </Button>
      </div>
      <div className="bar" aria-hidden="true">
        <div style={{ width: `${totalWork ? (doneWork / totalWork) * 100 : 0}%`, background: 'var(--ok)' }} />
      </div>

      {stale && (
        <Card className="flex flex-col gap-2" style={{ background: 'var(--warn-soft)', borderColor: 'transparent' }}>
          <strong>{tr('workout.staleTitle')}</strong>
          <p className="text-[0.85rem]">{tr('workout.staleText', { date: formatDate(active.date, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={discard}>
              {tr('workout.staleDiscard')}
            </Button>
            <Button size="sm" onClick={() => setFinishOpen(true)}>
              {tr('workout.staleFinish')}
            </Button>
          </div>
        </Card>
      )}

      {(active.readiness != null || active.deload) && (
        <div className="flex items-center flex-wrap gap-2">
          {active.deload && <Badge variant="warn">{tr('workout.deloadWeek')}</Badge>}
          {active.readiness != null && (
            <Badge variant={active.readiness >= 70 ? 'ok' : active.readiness >= 45 ? 'default' : 'warn'}>{tr('workout.readiness', { n: active.readiness })}</Badge>
          )}
        </div>
      )}

      {active.exercises.map((se) => {
        const ex = lib.get(se.exerciseId)
        if (!ex) return null
        return (
          <ExerciseCard
            key={se.key}
            se={se}
            ex={ex}
            onInfo={() => setInfo(ex)}
            onSwap={() => setSwapKey(se.key)}
            onDone={(i) => onSetDone(se, i)}
            onChange={(i, patch) => s.updateSet(se.key, i, patch)}
            onAdd={() => s.addSet(se.key)}
            onRemove={(i) => s.removeSet(se.key, i)}
          />
        )
      })}

      <Button variant="ghost" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={discard}>
        {tr('workout.discard')}
      </Button>

      {rest && <RestTimer rest={rest} onChange={setRest} sound={s.settings.restTimerSound} vibrate={s.settings.restTimerVibrate} />}
      <ExerciseInfo ex={info} onClose={() => setInfo(null)} />
      <SwapSheet exKey={swapKey} onClose={() => setSwapKey(null)} />
      <FinishSheet open={finishOpen} onClose={() => setFinishOpen(false)} />
    </div>
  )
}

function ExerciseCard({
  se,
  ex,
  onInfo,
  onSwap,
  onDone,
  onChange,
  onAdd,
  onRemove,
}: {
  se: SessionExercise
  ex: Exercise
  onInfo: () => void
  onSwap: () => void
  onDone: (i: number) => void
  onChange: (i: number, p: Partial<SetEntry>) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const bw = ex.loadType === 'koerpergewicht'
  const work = se.sets.filter((x) => x.kind !== 'aufwaermen')
  const { t } = useT()
  const name = exerciseName(ex)
  const note = noteText(se)
  const allDone = se.sets.length > 0 && se.sets.every((x) => x.done)
  let n = 0
  return (
    <Card className="flex flex-col gap-2" style={{ gap: 10, opacity: allDone ? 0.75 : 1 }} aria-label={name}>
      <div className="flex items-center gap-2" style={{ alignItems: 'flex-start' }}>
        <button className="min-w-0 flex-1" onClick={onInfo} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}>
          {se.superset && <span className="ss-tag">{t('workout.superset', { tag: se.superset })}</span>}
          <h3 style={{ display: 'inline' }}>{name}</h3>
          <div className="text-[0.85rem] text-muted-foreground">{t('workout.target', { sets: work.length, min: se.repMin, max: se.repMax, rir: (work.find((x) => x.kind === 'arbeit') ?? work[0])?.targetRir ?? 2, rest: fmt(se.restSec / 60, 1) })}</div>
        </button>
        <Button variant="ghost" size="icon" onClick={onSwap} aria-label={t('workout.swapLabel', { name })}>
          <Icon name="swap" size={20} />
        </Button>
      </div>
      {note && (
        <p className="text-[0.85rem]" style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 10 }}>
          {note}
        </p>
      )}
      <div className="set-row head">
        <span>{t('workout.colSet')}</span>
        <span style={{ textAlign: 'center' }}>{bw ? t('workout.colExtraKg') : t('workout.colKg')}</span>
        <span style={{ textAlign: 'center' }}>{t('workout.colReps')}</span>
        <span style={{ textAlign: 'center' }}>{t('workout.colRir')}</span>
        <span />
      </div>
      {se.sets.map((set, i) => {
        const label = set.kind === 'aufwaermen' ? t('workout.warmLetter') : set.kind === 'test' ? t('workout.testLetter') : String(++n)
        return (
          <div key={i} className={`set-row ${set.done ? 'done' : ''}`}>
            <button
              className={`set-idx ${set.kind === 'aufwaermen' ? 'warm' : set.kind === 'test' ? 'test' : ''}`}
              aria-label={t('workout.removeSet', { label })}
              title={set.kind === 'aufwaermen' ? t('workout.warmSet') : set.kind === 'test' ? t('workout.testSet') : t('workout.workSet')}
              onClick={() => {
                if (confirmAction(t('workout.removeConfirm'))) onRemove(i)
              }}
            >
              {label}
            </button>
            <NumInput
              value={set.weight}
              placeholder={set.targetWeight != null ? fmt(set.targetWeight, 2) : bw ? '0' : '?'}
              onChange={(v) => onChange(i, { weight: v })}
              label={t('workout.weightOf', { label })}
              decimal
            />
            <NumInput value={set.reps} placeholder={String(set.targetReps)} onChange={(v) => onChange(i, { reps: v })} label={t('workout.repsOf', { label })} />
            <span className="set-select">
              <select
                className="set-input"
                style={{ color: set.rir == null && !set.done ? 'var(--muted)' : undefined }}
                aria-label={t('workout.rirOf', { label })}
                value={set.rir ?? ''}
                onChange={(e) => onChange(i, { rir: e.target.value === '' ? undefined : Number(e.target.value) })}
                disabled={set.kind === 'aufwaermen'}
              >
                <option value="">{set.kind === 'aufwaermen' ? '–' : set.targetRir}</option>
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {set.kind !== 'aufwaermen' && <Icon name="down" size={12} stroke={2.4} />}
            </span>
            <button className={`check ${set.done ? 'on' : ''}`} onClick={() => onDone(i)} aria-pressed={set.done} aria-label={set.done ? t('workout.uncheckSet', { label }) : t('workout.checkSet', { label })}>
              <Icon name="check" size={20} stroke={2.6} />
            </button>
          </div>
        )
      })}
      {se.sets.some((x) => x.kind === 'test' && !x.done) && (
        <p className="text-xs text-muted-foreground">{t('workout.testHint', { reps: se.sets.find((x) => x.kind === 'test')?.targetReps ?? 10 })}</p>
      )}
      <Button variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onClick={onAdd}>
        <Icon name="plus" size={16} /> {t('workout.addSet')}
      </Button>
    </Card>
  )
}

function NumInput({ value, placeholder, onChange, label, decimal }: { value?: number; placeholder: string; onChange: (v: number | undefined) => void; label: string; decimal?: boolean }) {
  // null = not editing: show the stored value; while typing keep the raw text (e.g. "62,")
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value != null ? String(value).replace('.', ',') : '')
  return (
    <input
      className="set-input"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      onFocus={(e) => {
        setDraft(shown)
        e.currentTarget.select()
      }}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, '')
        setDraft(t)
        const n = parseFloat(t.replace(',', '.'))
        onChange(Number.isFinite(n) ? n : undefined)
      }}
    />
  )
}

function Elapsed({ since }: { since: string }) {
  const now = useNow(1000)
  const secs = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const ss = secs % 60
  return <>{h ? `${h}:${String(m).padStart(2, '0')}` : m}:{String(ss).padStart(2, '0')}</>
}

/** Epoch ms that re-renders every `interval` ms. */
function useNow(interval: number): number {
  const [now, setNow] = useState(() => nowMs())
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), interval)
    return () => window.clearInterval(id)
  }, [interval])
  return now
}

function beep() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = t === 0.5 ? 1320 : 880
      g.gain.setValueAtTime(0.25, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.2)
    })
  } catch {
    /* audio not available */
  }
}

function RestTimer({ rest, onChange, sound, vibrate }: { rest: { end: number; total: number }; onChange: (r: { end: number; total: number } | null) => void; sound: boolean; vibrate: boolean }) {
  const now = useNow(250)
  const fired = useRef(false)
  useEffect(() => {
    fired.current = false
  }, [rest.end])
  const left = Math.max(0, Math.ceil((rest.end - now) / 1000))
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true
      if (sound) beep()
      if (vibrate && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
      const t = window.setTimeout(() => onChange(null), 2500)
      return () => window.clearTimeout(t)
    }
  }, [left, sound, vibrate, onChange])
  const m = Math.floor(left / 60)
  const sec = left % 60
  return (
    <div className="timer-bar" role="timer" aria-live="off" aria-label={tr('workout.rest')}>
      <Icon name="timer" />
      <span className="t">{left === 0 ? tr('workout.go') : `${m}:${String(sec).padStart(2, '0')}`}</span>
      <button onClick={() => onChange({ ...rest, end: rest.end - 15000 })} aria-label={tr('workout.minus15')}>
        −15
      </button>
      <button onClick={() => onChange({ end: rest.end + 15000, total: rest.total + 15 })} aria-label={tr('workout.plus15')}>
        +15
      </button>
      <button onClick={() => onChange(null)} aria-label={tr('workout.skipRest')}>
        <Icon name="close" size={18} />
      </button>
      <div className="timer-progress">
        <div style={{ width: `${(1 - left / rest.total) * 100}%` }} />
      </div>
    </div>
  )
}

function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => undefined)
    }
    acquire()
    const onVis = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => undefined)
    }
  }, [on])
}

export function ExerciseInfo({ ex, onClose }: { ex: Exercise | null; onClose: () => void }) {
  const { t, tk } = useT()
  const name = ex ? exerciseName(ex) : undefined
  return (
    <Sheet open={!!ex} onClose={onClose} title={name}>
      {ex && (
        <div className="flex flex-col gap-4">
          <ExerciseAnimation exerciseId={ex.id} label={name!} />
          <div className="flex items-center flex-wrap gap-2">
            <Badge variant="accent">{tk(`labels.muscle.${ex.primary}`)}</Badge>
            {ex.secondary.map((m) => (
              <Badge key={m}>
                {tk(`labels.muscle.${m}`)}
              </Badge>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <h3>{t('workout.howTo')}</h3>
            <ol style={{ margin: 0, paddingLeft: 20 }} className="flex flex-col gap-2">
              {exerciseCues(ex).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </div>
          <a className={buttonVariants({ variant: 'secondary', className: 'w-full whitespace-normal text-center leading-tight py-2.5' })} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${t('workout.videoSuffix')}`)}`} target="_blank" rel="noreferrer">
            {t('workout.videos')}
          </a>
        </div>
      )}
    </Sheet>
  )
}

function SwapSheet({ exKey, onClose }: { exKey: string | null; onClose: () => void }) {
  const s = useStore()
  const [permanent, setPermanent] = useState(true)
  const [anyEquipment, setAnyEquipment] = useState(false)
  const se = s.active?.exercises.find((e) => e.key === exKey)
  const options = se
    ? allExercises(s).filter((e) => e.slot === se.slot && e.id !== se.exerciseId && (anyEquipment || hasEquipment(s.profile!.equipment, e)))
    : []
  return (
    <Sheet open={!!se} onClose={onClose} title={tr('workout.swapTitle')}>
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-[0.85rem]">{tr('workout.swapIntro')}</p>
        <label className="flex items-center gap-2" style={{ gap: 10 }}>
          <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span>{tr('workout.swapPermanent')}</span>
        </label>
        <label className="flex items-center gap-2" style={{ gap: 10 }}>
          <input type="checkbox" checked={anyEquipment} onChange={(e) => setAnyEquipment(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span>{tr('workout.swapAnyEquipment')}</span>
        </label>
        <Card className="flex flex-col divide-y divide-border" style={{ padding: '0 16px' }}>
          {options.length === 0 && <p className="empty-state">{tr('workout.noAlternatives')}</p>}
          {options.map((o) => (
            <button
              key={o.id}
              className="list-row"
              onClick={() => {
                s.swapExercise(exKey!, o.id, permanent)
                toast(tr('workout.swapped', { name: exerciseName(o) }))
                onClose()
              }}
            >
              <span className="min-w-0 flex-1">
                <strong>{exerciseName(o)}</strong>
                <span className="text-[0.85rem] text-muted-foreground" style={{ display: 'block' }}>
                  {exerciseCues(o)[0]}
                </span>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </Card>
      </div>
    </Sheet>
  )
}

function FinishSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  // mounted only while open, so the summary is computed once per opening
  return open ? <FinishContent onClose={onClose} /> : null
}

function FinishContent({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [now] = useState(() => nowMs())
  const nav = useNavigate()
  const lib = useMemo(() => exerciseMap(s), [s])
  const [rating, setRating] = useState(4)
  const [notes, setNotes] = useState('')
  const active = s.active
  if (!active) return null
  const end = sessionEndMs(active.startedAt, now)
  const preview = { ...active, finishedAt: new Date(end).toISOString(), exercises: active.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })) }
  const open_ = active.exercises.reduce((a, e) => a + e.sets.filter((x) => !x.done && x.kind !== 'aufwaermen').length, 0)
  const prs = prsInSession([...s.sessions, preview], preview)
  // a forgotten session has no real duration
  const mins = isStaleSession(active.startedAt, now) ? '–' : Math.round((end - new Date(active.startedAt).getTime()) / 60000)
  return (
    <Sheet open onClose={onClose} title={tr('workout.finishTitle')}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 flex flex-col gap-0.5">
            <span className="text-[1.4rem] font-extrabold tabular-nums">{mins}</span>
            <span className="text-[0.78rem] font-semibold text-muted-foreground">{tr('common.minutes')}</span>
          </Card>
          <Card className="p-3 flex flex-col gap-0.5">
            <span className="text-[1.4rem] font-extrabold tabular-nums">{sessionSets(preview)}</span>
            <span className="text-[0.78rem] font-semibold text-muted-foreground">{tr('common.sets')}</span>
          </Card>
          <Card className="p-3 flex flex-col gap-0.5">
            <span className="text-[1.4rem] font-extrabold tabular-nums">{fmt(sessionVolume(preview) / 1000, 1)} t</span>
            <span className="text-[0.78rem] font-semibold text-muted-foreground">{tr('workout.volume')}</span>
          </Card>
        </div>
        {prs.length > 0 && (
          <Card style={{ background: 'var(--ok-soft)', borderColor: 'transparent' }}>
            <strong>{tr('workout.newPr', { n: prs.length })}</strong>
            <p className="text-[0.85rem]">{prs.map((id) => (lib.get(id) ? exerciseName(lib.get(id)!) : id)).join(', ')}</p>
          </Card>
        )}
        {open_ > 0 && <p className="text-[0.85rem]" style={{ color: 'var(--warn)' }}>{tr('workout.openSets', { n: open_ })}</p>}
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('workout.howWasIt')}</span>
          <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {['😫', '😕', '😐', '🙂', '🔥'].map((e, i) => (
              <Button variant="chip" key={e} style={{ justifyContent: 'center', fontSize: '1.3rem', minHeight: 52 }} aria-pressed={rating === i + 1} aria-label={tr('workout.ratingOf', { n: i + 1 })} onClick={() => setRating(i + 1)}>
                {e}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes">{tr('workout.note')}</label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('workout.notePlaceholder')} />
        </div>
        <Button
          className="w-full whitespace-normal text-center leading-tight py-2.5"
          onClick={() => {
            s.finishSession(rating, notes.trim() || undefined)
            toast(tr('workout.saved'))
            nav('/')
          }}
        >
          {tr('common.save')}
        </Button>
      </div>
    </Sheet>
  )
}
