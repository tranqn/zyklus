import { useMemo, useState } from 'react'
import { hasEquipment } from '../domain/exercises'
import { estimateMinutes, isDeload, targetRir } from '../domain/planner'
import { cyclePosition } from '../domain/progression'
import type { Equipment, Exercise, Muscle, PlanDay, PlanSlot, Program, Slot } from '../domain/types'
import { uid } from '../domain/util'
import { allExercises, exerciseMap, useStore } from '../store'
import { Icon, Segmented, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { ExerciseInfo } from './Workout'
import { t as tr, tk as tkr, useT } from '../i18n'
import { exerciseName } from '../i18n/content/exercises'
import { dayName, splitName } from '../i18n/display'
import { normalize } from '../domain/nutrition'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input, NativeSelect } from '@/components/ui/input'

export default function Plan() {
  const s = useStore()
  const meso = s.meso!
  const profile = s.profile!
  const lib = useMemo(() => exerciseMap(s), [s])
  const pos = cyclePosition(meso, s.sessions)
  const [edit, setEdit] = useState<{ day: PlanDay; slot: PlanSlot } | null>(null)
  const [addTo, setAddTo] = useState<PlanDay | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)
  const [picking, setPicking] = useState(false)
  const { t } = useT()

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{t('plan.meso', { n: meso.number })}</div>
          <h1>{splitName(meso)}</h1>
        </div>
      </div>

      <Card className="flex flex-col gap-2">
        <h3>{t('plan.weeks')}</h3>
        <div className="flex items-center gap-2" style={{ gap: 6 }}>
          {Array.from({ length: meso.weeks }, (_, w) => {
            const dl = isDeload(w, meso.weeks)
            const current = w === pos.week && !meso.completed
            const past = w < pos.week || meso.completed
            return (
              <div
                key={w}
                className="min-w-0 flex-1 flex flex-col gap-2"
                style={{
                  gap: 2,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderRadius: 12,
                  background: current ? 'var(--accent)' : past ? 'var(--accent-soft)' : 'var(--surface-2)',
                  color: current ? 'var(--accent-ink)' : undefined,
                }}
              >
                <span className="text-xs" style={{ fontWeight: 700 }}>
                  W{w + 1}
                </span>
                <span className="text-xs">{dl ? t('common.deload') : `${targetRir(w, meso.weeks, profile.level)} RIR`}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[0.85rem] text-muted-foreground">{t('plan.rirExplain')}</p>
      </Card>

      {meso.days.map((day, di) => (
        <Card key={day.id} className="flex flex-col gap-2" style={{ gap: 4 }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="eyebrow">
                {t('plan.unit', { n: di + 1 })} {di === pos.dayIndex && !meso.completed ? t('plan.upNext') : ''}
              </div>
              <h2>{dayName(day)}</h2>
            </div>
            <Badge>{t('plan.approxMin', { n: estimateMinutes(day) })}</Badge>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {day.slots.map((sl) => {
              const ex = lib.get(sl.exerciseId)
              return (
                <div key={sl.key} className="list-row">
                  <button style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} className="min-w-0 flex-1" onClick={() => setEdit({ day, slot: sl })}>
                    <div style={{ fontWeight: 600 }}>
                      {sl.superset && <span className="ss-tag">{sl.superset} </span>}
                      {ex ? exerciseName(ex) : t('plan.unknownExercise')}
                    </div>
                    <div className="text-[0.85rem] text-muted-foreground">{t('plan.slotMeta', { sets: sl.sets, min: sl.repMin, max: sl.repMax, rest: sl.restSec })}</div>
                  </button>
                  <Button variant="ghost" size="icon" aria-label={t('plan.infoFor', { name: ex ? exerciseName(ex) : '' })} onClick={() => ex && setInfo(ex)}>
                    <Icon name="info" size={20} />
                  </Button>
                </div>
              )
            })}
          </div>
          <Button variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAddTo(day)}>
            <Icon name="plus" size={16} /> {t('plan.addExercise')}
          </Button>
        </Card>
      ))}

      <Card className="flex flex-col gap-2">
        <h3>{t('plan.program.title')}</h3>
        <p className="text-[0.85rem] text-muted-foreground">{t('plan.program.active', { name: t(meso.program === 'winter_arc' ? 'plan.program.winterArc' : 'plan.program.auto') })}</p>
        <Button variant="secondary" onClick={() => setPicking(true)}>
          {t('plan.program.change')}
        </Button>
      </Card>

      <Card className="flex flex-col gap-2">
        <h3>{t('plan.regenTitle')}</h3>
        <p className="text-[0.85rem] text-muted-foreground">{t('plan.regenText')}</p>
        <Button variant="secondary"
         
          onClick={() => {
            if (confirmAction(t('plan.regenConfirm'))) {
              s.regeneratePlan()
              toast(t('plan.regenDone'))
            }
          }}
        >
          {t('plan.regenButton')}
        </Button>
      </Card>

      {picking && <ProgramPicker onClose={() => setPicking(false)} />}
      <SlotEditor edit={edit} onClose={() => setEdit(null)} />
      <AddExercise day={addTo} onClose={() => setAddTo(null)} />
      <ExerciseInfo ex={info} onClose={() => setInfo(null)} />
    </div>
  )
}

const WINTER_ARC_GEAR: Equipment[] = ['klimmzugstange', 'dipbarren']

function ProgramPicker({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const profile = s.profile!
  const [program, setProgram] = useState<Program>(s.meso?.program ?? 'auto')
  const [week, setWeek] = useState<'three' | 'own'>('three')
  const ownDays = profile.trainingDays.length
  const missing = WINTER_ARC_GEAR.filter((g) => !profile.equipment.includes(g))
  const apply = () => {
    if (!confirmAction(tr('plan.program.confirm'))) return
    const days = program === 'winter_arc' && week === 'three' && ownDays !== 3 ? { daysPerWeek: 3, trainingDays: [0, 2, 4] } : {}
    s.updateProfile({ program, ...days }, true)
    toast(tr('plan.program.done'))
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={tr('plan.program.title')}>
      <div className="flex flex-col gap-4">
        <Segmented
          value={program}
          onChange={setProgram}
          label={tr('plan.program.title')}
          options={[
            { value: 'auto', label: tr('plan.program.auto') },
            { value: 'winter_arc', label: tr('plan.program.winterArc') },
          ]}
        />
        {program === 'auto' ? (
          <p className="text-[0.85rem] text-muted-foreground">{tr('plan.program.autoText')}</p>
        ) : (
          <>
            <p className="text-[0.85rem]">{tr('plan.program.winterArcText')}</p>
            <p className="text-[0.85rem] text-muted-foreground">{tr('plan.program.levelHint')}</p>
            {missing.length > 0 && <p className="text-[0.85rem] text-muted-foreground">{tr('plan.program.gearHint', { gear: missing.map((g) => tkr(`labels.equipment.${g}`)).join(', ') })}</p>}
            {ownDays !== 3 && (
              <div className="flex flex-col gap-2">
                <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('plan.program.week')}</span>
                <Segmented
                  value={week}
                  onChange={setWeek}
                  label={tr('plan.program.week')}
                  options={[
                    { value: 'three', label: tr('plan.program.three') },
                    { value: 'own', label: tr('plan.program.own', { n: ownDays }) },
                  ]}
                />
                <p className="text-[0.85rem] text-muted-foreground">{week === 'three' ? tr('plan.program.threeHint') : tr('plan.program.ownHint', { n: ownDays })}</p>
              </div>
            )}
          </>
        )}
        <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={apply}>
          {tr('plan.program.apply')}
        </Button>
      </div>
    </Sheet>
  )
}

function SlotEditor({ edit, onClose }: { edit: { day: PlanDay; slot: PlanSlot } | null; onClose: () => void }) {
  const s = useStore()
  const live = edit && s.meso?.days.find((d) => d.id === edit.day.id)?.slots.find((x) => x.key === edit.slot.key)
  const lib = exerciseMap(s)
  const ex = live ? lib.get(live.exerciseId) : undefined
  if (!edit || !live) return null
  const patch = (p: Partial<PlanSlot>) => s.editPlanSlot(edit.day.id, live.key, p)
  const alternatives = allExercises(s).filter((e) => e.slot === live.slot && e.id !== live.exerciseId && hasEquipment(s.profile!.equipment, e))
  return (
    <Sheet open onClose={onClose} title={ex ? exerciseName(ex) : undefined}>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('plan.setsPerSession')}</span>
            <Stepper label={tr('common.sets')} value={live.sets} onChange={(v) => patch({ sets: v })} min={1} max={8} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('plan.repsMin')}</span>
              <Stepper label={tr('plan.repsMinLabel')} value={live.repMin} onChange={(v) => patch({ repMin: v, repMax: Math.max(v, live.repMax) })} min={1} max={30} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('plan.repsMax')}</span>
              <Stepper label={tr('plan.repsMaxLabel')} value={live.repMax} onChange={(v) => patch({ repMax: v, repMin: Math.min(v, live.repMin) })} min={1} max={40} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[0.85rem] font-semibold text-muted-foreground">{tr('plan.rest')}</span>
            <Stepper label={tr('plan.rest')} value={live.restSec} onChange={(v) => patch({ restSec: v })} step={15} min={30} max={420} suffix="s" />
          </div>
        </Card>
        {alternatives.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="alt">{tr('plan.replace')}</label>
            <NativeSelect
              id="alt"
             
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  patch({ exerciseId: e.target.value })
                  toast(tr('plan.replaced'))
                }
              }}
            >
              <option value="">{tr('plan.pickAlternative')}</option>
              {alternatives.map((a) => (
                <option key={a.id} value={a.id}>
                  {exerciseName(a)}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="min-w-0 flex-1" onClick={() => s.movePlanSlot(edit.day.id, live.key, -1)}>
            <Icon name="up" size={18} /> {tr('plan.moveUp')}
          </Button>
          <Button variant="secondary" className="min-w-0 flex-1" onClick={() => s.movePlanSlot(edit.day.id, live.key, 1)}>
            <Icon name="down" size={18} /> {tr('plan.moveDown')}
          </Button>
        </div>
        <Button variant="destructive"
          className="w-full whitespace-normal text-center leading-tight py-2.5"
          onClick={() => {
            s.removePlanSlot(edit.day.id, live.key)
            onClose()
          }}
        >
          <Icon name="trash" size={18} /> {tr('plan.removeFromDay')}
        </Button>
        <Button variant="ghost"
          className="w-full whitespace-normal text-center leading-tight py-2.5"
          onClick={() => {
            s.updateSettings({ excludedExercises: [...s.settings.excludedExercises, live.exerciseId] })
            toast(tr('plan.excluded'))
          }}
        >
          {tr('plan.exclude')}
        </Button>
      </div>
    </Sheet>
  )
}

function AddExercise({ day, onClose }: { day: PlanDay | null; onClose: () => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  if (!day) return null
  const profile = s.profile!
  const nq = normalize(q)
  const list = allExercises(s).filter(
    (e) => hasEquipment(profile.equipment, e) && (!nq || normalize(exerciseName(e)).includes(nq) || normalize(e.name).includes(nq) || normalize(tkr(`labels.slot.${e.slot}`)).includes(nq)),
  )
  const add = (e: Exercise) => {
    const compound = e.compound
    const range: [number, number] = e.loadType === 'koerpergewicht' ? [8, 15] : compound ? [6, 10] : [10, 15]
    s.addPlanSlot(day.id, { key: uid(), slot: e.slot, exerciseId: e.id, sets: 3, repMin: range[0], repMax: range[1], restSec: compound ? 150 : 90 })
    toast(tr('plan.added', { name: exerciseName(e) }))
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={tr('plan.addTo', { day: dayName(day) })}>
      {creating ? (
        <CustomExerciseForm
          onDone={(e) => {
            setCreating(false)
            if (e) add(e)
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input placeholder={tr('plan.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={tr('plan.searchLabel')} />
          </div>
          <Button variant="secondary" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> {tr('plan.createCustom')}
          </Button>
          <Card className="flex flex-col divide-y divide-border" style={{ padding: '0 16px' }}>
            {list.slice(0, 60).map((e) => (
              <button key={e.id} className="list-row" onClick={() => add(e)}>
                <span className="min-w-0 flex-1">
                  <strong>{exerciseName(e)}</strong>
                  <span className="text-[0.85rem] text-muted-foreground" style={{ display: 'block' }}>
                    {tkr(`labels.slot.${e.slot}`)} · {e.equipment.map((x) => tkr(`labels.equipment.${x}`)).join(', ')}
                  </span>
                </span>
                <Icon name="plus" size={18} />
              </button>
            ))}
          </Card>
        </div>
      )}
    </Sheet>
  )
}

const EQUIPMENT_KEYS: Equipment[] = ['langhantel', 'kurzhantel', 'bank', 'kabel', 'maschine', 'klimmzugstange', 'dipbarren', 'baender', 'kettlebell', 'koerpergewicht']

const SLOT_PRIMARY: Record<Slot, Muscle> = {
  brust_compound: 'brust',
  brust_schraeg: 'brust',
  brust_iso: 'brust',
  ruecken_vertikal: 'ruecken',
  ruecken_horizontal: 'ruecken',
  schulter_press: 'schultern',
  seitheben: 'schultern',
  hintere_schulter: 'schultern',
  bizeps: 'bizeps',
  trizeps: 'trizeps',
  kniebeuge: 'quadrizeps',
  hinge: 'beinbeuger',
  unilateral_bein: 'quadrizeps',
  quad_iso: 'quadrizeps',
  beinbeuger_iso: 'beinbeuger',
  gesaess_iso: 'gesaess',
  waden: 'waden',
  bauch: 'bauch',
  unterarme: 'unterarme',
}

function CustomExerciseForm({ onDone }: { onDone: (e?: Exercise) => void }) {
  const add = useStore((s) => s.addCustomExercise)
  const [name, setName] = useState('')
  const [slot, setSlot] = useState<Slot>('brust_compound')
  const [eq, setEq] = useState<Equipment>('maschine')
  const [loadType, setLoadType] = useState<'gewicht' | 'koerpergewicht'>('gewicht')
  const compoundSlots: Slot[] = ['brust_compound', 'brust_schraeg', 'ruecken_vertikal', 'ruecken_horizontal', 'schulter_press', 'kniebeuge', 'hinge', 'unilateral_bein']
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cx-name">{tr('plan.custom.name')}</label>
        <Input id="cx-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('plan.custom.namePlaceholder')} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cx-slot">{tr('plan.custom.pattern')}</label>
        <NativeSelect id="cx-slot" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
          {(Object.keys(SLOT_PRIMARY) as Slot[]).map((k) => (
            <option key={k} value={k}>
              {tkr(`labels.slot.${k}`)} ({tkr(`labels.muscle.${SLOT_PRIMARY[k]}`)})
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cx-eq">{tr('plan.custom.equipment')}</label>
        <NativeSelect id="cx-eq" value={eq} onChange={(e) => setEq(e.target.value as Equipment)}>
          {EQUIPMENT_KEYS.map((k) => (
            <option key={k} value={k}>
              {tkr(`labels.equipment.${k}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Segmented
        value={loadType}
        onChange={setLoadType}
        label={tr('plan.custom.load')}
        options={[
          { value: 'gewicht', label: tr('plan.custom.weighted') },
          { value: 'koerpergewicht', label: tr('plan.custom.bodyweight') },
        ]}
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="min-w-0 flex-1" onClick={() => onDone()}>
          {tr('common.cancel')}
        </Button>
        <Button
          className="min-w-0 flex-1"
          disabled={!name.trim()}
          onClick={() => {
            const compound = compoundSlots.includes(slot)
            const e: Exercise = {
              id: `custom-${uid()}`,
              name: name.trim(),
              slot,
              primary: SLOT_PRIMARY[slot],
              secondary: [],
              equipment: [eq],
              loadType,
              compound,
              increment: loadType === 'koerpergewicht' ? 0 : compound ? 2.5 : 1,
              minLevel: 'anfaenger',
              cues: [tr('plan.custom.cue')],
              custom: true,
            }
            add(e)
            onDone(e)
          }}
        >
          {tr('plan.custom.create')}
        </Button>
      </div>
    </div>
  )
}
