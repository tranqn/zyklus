import { useMemo, useState } from 'react'
import { EQUIPMENT_LABEL, hasEquipment, MUSCLE_LABEL, SLOT_LABEL } from '../domain/exercises'
import { estimateMinutes, isDeload, targetRir } from '../domain/planner'
import { cyclePosition } from '../domain/progression'
import type { Equipment, Exercise, Muscle, PlanDay, PlanSlot, Slot } from '../domain/types'
import { uid } from '../domain/util'
import { allExercises, exerciseMap, useStore } from '../store'
import { Icon, Segmented, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { ExerciseInfo } from './Workout'

export default function Plan() {
  const s = useStore()
  const meso = s.meso!
  const profile = s.profile!
  const lib = useMemo(() => exerciseMap(s), [s])
  const pos = cyclePosition(meso, s.sessions)
  const [edit, setEdit] = useState<{ day: PlanDay; slot: PlanSlot } | null>(null)
  const [addTo, setAddTo] = useState<PlanDay | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Mesozyklus {meso.number}</div>
          <h1>{meso.split}</h1>
        </div>
      </div>

      <div className="card stack">
        <h3>Wochenverlauf</h3>
        <div className="row" style={{ gap: 6 }}>
          {Array.from({ length: meso.weeks }, (_, w) => {
            const dl = isDeload(w, meso.weeks)
            const current = w === pos.week && !meso.completed
            const past = w < pos.week || meso.completed
            return (
              <div
                key={w}
                className="grow stack"
                style={{
                  gap: 2,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderRadius: 12,
                  background: current ? 'var(--accent)' : past ? 'var(--accent-soft)' : 'var(--surface-2)',
                  color: current ? 'var(--accent-ink)' : undefined,
                }}
              >
                <span className="tiny" style={{ fontWeight: 700 }}>
                  W{w + 1}
                </span>
                <span className="tiny">{dl ? 'Deload' : `${targetRir(w, meso.weeks, profile.level)} RIR`}</span>
              </div>
            )
          })}
        </div>
        <p className="small muted">
          RIR = Wiederholungen in Reserve. Die Intensität steigt von Woche zu Woche, in der zweiten Hälfte kommt bei Grundübungen ein Satz dazu. Die Deload-Woche halbiert die Sätze, damit du erholt in den nächsten Zyklus startest.
        </p>
      </div>

      {meso.days.map((day, di) => (
        <section key={day.id} className="card stack" style={{ gap: 4 }}>
          <div className="row between">
            <div>
              <div className="eyebrow">
                Einheit {di + 1} {di === pos.dayIndex && !meso.completed ? '· als Nächstes' : ''}
              </div>
              <h2>{day.name}</h2>
            </div>
            <span className="badge">ca. {estimateMinutes(day)} min</span>
          </div>
          <div className="list">
            {day.slots.map((sl) => {
              const ex = lib.get(sl.exerciseId)
              return (
                <div key={sl.key} className="list-item">
                  <button style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} className="grow" onClick={() => setEdit({ day, slot: sl })}>
                    <div style={{ fontWeight: 600 }}>
                      {sl.superset && <span className="ss-tag">{sl.superset} </span>}
                      {ex?.name ?? 'Unbekannte Übung'}
                    </div>
                    <div className="small muted">
                      {sl.sets} × {sl.repMin}–{sl.repMax} · Pause {sl.restSec}s
                    </div>
                  </button>
                  <button className="icon-btn plain" aria-label={`Infos zu ${ex?.name}`} onClick={() => ex && setInfo(ex)}>
                    <Icon name="info" size={20} />
                  </button>
                </div>
              )
            })}
          </div>
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAddTo(day)}>
            <Icon name="plus" size={16} /> Übung hinzufügen
          </button>
        </section>
      ))}

      <div className="card stack">
        <h3>Plan neu erstellen</h3>
        <p className="small muted">Erstellt den aktuellen Zyklus mit deinen Profildaten neu. Dein Verlauf bleibt erhalten.</p>
        <button
          className="btn"
          onClick={() => {
            if (confirmAction('Plan neu erstellen? Eigene Änderungen am Plan gehen verloren.')) {
              s.regeneratePlan()
              toast('Plan neu erstellt')
            }
          }}
        >
          Neu erstellen
        </button>
      </div>

      <SlotEditor edit={edit} onClose={() => setEdit(null)} />
      <AddExercise day={addTo} onClose={() => setAddTo(null)} />
      <ExerciseInfo ex={info} onClose={() => setInfo(null)} />
    </div>
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
    <Sheet open onClose={onClose} title={ex?.name}>
      <div className="stack lg">
        <div className="card stack lg">
          <div className="stack">
            <span className="label">Sätze pro Einheit</span>
            <Stepper label="Sätze" value={live.sets} onChange={(v) => patch({ sets: v })} min={1} max={8} />
          </div>
          <div className="grid2">
            <div className="stack">
              <span className="label">Wdh. min</span>
              <Stepper label="Minimale Wiederholungen" value={live.repMin} onChange={(v) => patch({ repMin: v, repMax: Math.max(v, live.repMax) })} min={1} max={30} />
            </div>
            <div className="stack">
              <span className="label">Wdh. max</span>
              <Stepper label="Maximale Wiederholungen" value={live.repMax} onChange={(v) => patch({ repMax: v, repMin: Math.min(v, live.repMin) })} min={1} max={40} />
            </div>
          </div>
          <div className="stack">
            <span className="label">Satzpause</span>
            <Stepper label="Satzpause" value={live.restSec} onChange={(v) => patch({ restSec: v })} step={15} min={30} max={420} suffix="s" />
          </div>
        </div>
        {alternatives.length > 0 && (
          <div className="field">
            <label htmlFor="alt">Übung ersetzen</label>
            <select
              id="alt"
              className="input"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  patch({ exerciseId: e.target.value })
                  toast('Übung ersetzt')
                }
              }}
            >
              <option value="">Alternative wählen …</option>
              {alternatives.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="row">
          <button className="btn grow" onClick={() => s.movePlanSlot(edit.day.id, live.key, -1)}>
            <Icon name="up" size={18} /> Nach oben
          </button>
          <button className="btn grow" onClick={() => s.movePlanSlot(edit.day.id, live.key, 1)}>
            <Icon name="down" size={18} /> Nach unten
          </button>
        </div>
        <button
          className="btn danger block"
          onClick={() => {
            s.removePlanSlot(edit.day.id, live.key)
            onClose()
          }}
        >
          <Icon name="trash" size={18} /> Aus dieser Einheit entfernen
        </button>
        <button
          className="btn ghost block"
          onClick={() => {
            s.updateSettings({ excludedExercises: [...s.settings.excludedExercises, live.exerciseId] })
            toast('Wird bei neuen Plänen nicht mehr verwendet')
          }}
        >
          Übung künftig ausschließen
        </button>
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
  const list = allExercises(s).filter((e) => hasEquipment(profile.equipment, e) && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || SLOT_LABEL[e.slot].toLowerCase().includes(q.toLowerCase())))
  const add = (e: Exercise) => {
    const compound = e.compound
    const range: [number, number] = e.loadType === 'koerpergewicht' ? [8, 15] : compound ? [6, 10] : [10, 15]
    s.addPlanSlot(day.id, { key: uid(), slot: e.slot, exerciseId: e.id, sets: 3, repMin: range[0], repMax: range[1], restSec: compound ? 150 : 90 })
    toast(`${e.name} hinzugefügt`)
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={`Zu „${day.name}" hinzufügen`}>
      {creating ? (
        <CustomExerciseForm
          onDone={(e) => {
            setCreating(false)
            if (e) add(e)
          }}
        />
      ) : (
        <div className="stack lg">
          <div className="row">
            <input className="input" placeholder="Suchen, z. B. Bizeps oder Rudern" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Übung suchen" />
          </div>
          <button className="btn block" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> Eigene Übung anlegen
          </button>
          <div className="card list" style={{ padding: '0 16px' }}>
            {list.slice(0, 60).map((e) => (
              <button key={e.id} className="list-item" onClick={() => add(e)}>
                <span className="grow">
                  <strong>{e.name}</strong>
                  <span className="small muted" style={{ display: 'block' }}>
                    {SLOT_LABEL[e.slot]} · {e.equipment.map((x) => EQUIPMENT_LABEL[x]).join(', ')}
                  </span>
                </span>
                <Icon name="plus" size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  )
}

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
    <div className="stack lg">
      <div className="field">
        <label htmlFor="cx-name">Name</label>
        <input id="cx-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Kabel-Crossover tief" />
      </div>
      <div className="field">
        <label htmlFor="cx-slot">Bewegungsmuster (für Tausch und Statistik)</label>
        <select id="cx-slot" className="input" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
          {(Object.keys(SLOT_LABEL) as Slot[]).map((k) => (
            <option key={k} value={k}>
              {SLOT_LABEL[k]} ({MUSCLE_LABEL[SLOT_PRIMARY[k]]})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="cx-eq">Ausstattung</label>
        <select id="cx-eq" className="input" value={eq} onChange={(e) => setEq(e.target.value as Equipment)}>
          {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((k) => (
            <option key={k} value={k}>
              {EQUIPMENT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <Segmented
        value={loadType}
        onChange={setLoadType}
        label="Belastung"
        options={[
          { value: 'gewicht', label: 'Mit Gewicht' },
          { value: 'koerpergewicht', label: 'Körpergewicht' },
        ]}
      />
      <div className="row">
        <button className="btn grow" onClick={() => onDone()}>
          Abbrechen
        </button>
        <button
          className="btn primary grow"
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
              cues: ['Eigene Übung: saubere, kontrollierte Ausführung.'],
              custom: true,
            }
            add(e)
            onDone(e)
          }}
        >
          Anlegen
        </button>
      </div>
    </div>
  )
}
