import { useState } from 'react'
import { macrosOf, totals } from '../domain/nutrition'
import type { FoodEntry, Meal, Recipe } from '../domain/types'
import { addDays, uid } from '../domain/util'
import { useStore } from '../store'
import { Icon, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'

/** Save the entries of one meal as a reusable recipe. */
export function SaveRecipeSheet({ items, onClose }: { items: FoodEntry[] | null; onClose: () => void }) {
  const saveRecipe = useStore((s) => s.saveRecipe)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(1)
  if (!items) return null
  const tot = totals(items)
  return (
    <Sheet open onClose={onClose} title="Als Rezept speichern">
      <div className="stack lg">
        <p className="small muted">
          {items.length} Zutaten · {Math.round(tot.kcal)} kcal gesamt. Beim nächsten Mal trägst du alles mit einem Tipp ein.
        </p>
        <div className="field">
          <label htmlFor="rname">Name</label>
          <input id="rname" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Protein-Porridge" autoFocus />
        </div>
        <div className="stack">
          <span className="label">Ergibt Portionen</span>
          <Stepper label="Portionen" value={servings} onChange={setServings} min={1} max={20} />
          {servings > 1 && <p className="tiny muted">Eine Portion hat ca. {Math.round(tot.kcal / servings)} kcal.</p>}
        </div>
        <button
          className="btn primary block"
          disabled={!name.trim()}
          onClick={() => {
            saveRecipe({ id: uid(), name: name.trim(), servings, items: items.map(({ foodId, name: n, grams, per100 }) => ({ foodId, name: n, grams, per100 })) })
            toast('Rezept gespeichert')
            onClose()
          }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}

/** Recipe tab inside the add-food sheet. */
export function RecipeTab({ day, meal, onDone }: { day: string; meal: Meal; onDone: () => void }) {
  const s = useStore()
  const [picked, setPicked] = useState<Recipe | null>(null)
  const [portions, setPortions] = useState(1)
  if (!s.recipes.length) {
    return <p className="empty small">Noch keine Rezepte. Trag eine Mahlzeit ein und tippe dort auf „Als Rezept speichern".</p>
  }
  if (picked) {
    const perPortion = totals(picked.items).kcal / Math.max(1, picked.servings)
    return (
      <div className="stack lg">
        <div>
          <h3>{picked.name}</h3>
          <p className="small muted">{picked.items.map((i) => i.name).join(', ')}</p>
        </div>
        <div className="stack">
          <span className="label">Portionen</span>
          <Stepper label="Portionen" value={portions} onChange={setPortions} step={0.5} min={0.5} max={10} />
        </div>
        <p className="small num">ca. {Math.round(perPortion * portions)} kcal</p>
        <div className="row">
          <button className="btn grow" onClick={() => setPicked(null)}>
            Zurück
          </button>
          <button
            className="btn primary grow"
            onClick={() => {
              s.logRecipe(picked, portions, day, meal)
              toast(`${picked.name} eingetragen`)
              onDone()
            }}
          >
            Eintragen
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="card list" style={{ padding: '0 16px' }}>
      {s.recipes.map((r) => {
        const t = totals(r.items)
        return (
          <div key={r.id} className="list-item">
            <button className="grow" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => (setPicked(r), setPortions(1))}>
              <strong>{r.name}</strong>
              <span className="small muted" style={{ display: 'block' }}>
                {Math.round(t.kcal / r.servings)} kcal · {Math.round(t.protein / r.servings)} g Protein pro Portion
              </span>
            </button>
            <button className="icon-btn plain" aria-label={`Rezept ${r.name} löschen`} onClick={() => confirmAction(`Rezept „${r.name}" löschen?`) && s.removeRecipe(r.id)}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

const PRESETS: [string, string][] = [
  ['Kreatin', '5 g'],
  ['Vitamin D3', '1.000 IE'],
  ['Omega-3', '1 g EPA/DHA'],
  ['Magnesium', '300 mg'],
  ['Whey Protein', '30 g'],
  ['Zink', '10 mg'],
  ['Koffein', '200 mg'],
]

export function SupplementsCard({ day }: { day: string }) {
  const s = useStore()
  const [manage, setManage] = useState(false)
  const taken = s.supplementLog[day] ?? []
  return (
    <section className="card stack">
      <div className="row between">
        <div>
          <h3>Supplements</h3>
          {s.supplements.length > 0 && (
            <span className="small muted num">
              {taken.filter((id) => s.supplements.some((x) => x.id === id)).length} von {s.supplements.length} genommen
            </span>
          )}
        </div>
        <button className="btn sm" onClick={() => setManage(true)}>
          {s.supplements.length ? 'Verwalten' : 'Hinzufügen'}
        </button>
      </div>
      {s.supplements.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {s.supplements.map((sup) => {
            const on = taken.includes(sup.id)
            return (
              <button key={sup.id} className="row" style={{ background: 'none', border: 0, padding: '4px 0', textAlign: 'left', gap: 12 }} onClick={() => s.toggleSupplement(sup.id, day)} aria-pressed={on}>
                <span className={`check ${on ? 'on' : ''}`} style={{ width: 32, height: 32, borderRadius: 9 }} aria-hidden="true">
                  <Icon name="check" size={16} stroke={2.6} />
                </span>
                <span className="grow">
                  <span style={{ fontWeight: 600, textDecoration: on ? 'line-through' : undefined, opacity: on ? 0.6 : 1 }}>{sup.name}</span>
                  <span className="small muted"> · {sup.dose}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      {manage && <ManageSupplements onClose={() => setManage(false)} />}
    </section>
  )
}

function ManageSupplements({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const has = (n: string) => s.supplements.some((x) => x.name === n)
  return (
    <Sheet open onClose={onClose} title="Supplements verwalten">
      <div className="stack lg">
        {s.supplements.length > 0 && (
          <div className="card list" style={{ padding: '0 16px' }}>
            {s.supplements.map((sup) => (
              <div key={sup.id} className="list-item">
                <span className="grow">
                  <strong>{sup.name}</strong> <span className="small muted">{sup.dose}</span>
                </span>
                <button className="icon-btn plain" aria-label={`${sup.name} entfernen`} onClick={() => s.removeSupplement(sup.id)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="stack">
          <span className="label">Schnell hinzufügen</span>
          <div className="row wrap">
            {PRESETS.filter(([n]) => !has(n)).map(([n, d]) => (
              <button key={n} className="chip" onClick={() => s.addSupplement({ name: n, dose: d })}>
                <Icon name="plus" size={14} /> {n}
              </button>
            ))}
          </div>
        </div>
        <div className="stack">
          <span className="label">Eigenes Supplement</span>
          <div className="grid2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name des Supplements" />
            <input className="input" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dosis" aria-label="Dosis" />
          </div>
          <button
            className="btn"
            disabled={!name.trim()}
            onClick={() => {
              s.addSupplement({ name: name.trim(), dose: dose.trim() || '1 Portion' })
              setName('')
              setDose('')
            }}
          >
            Hinzufügen
          </button>
        </div>
        <p className="tiny muted">Hinweis: Nahrungsergänzung ersetzt keine ausgewogene Ernährung. Bei Fragen zu Dosierungen sprich mit Ärztin oder Arzt.</p>
      </div>
    </Sheet>
  )
}

/** "Save as recipe" and "same as yesterday" actions under a meal. */
export function MealActions({ day, meal, items, onSaveRecipe }: { day: string; meal: Meal; items: FoodEntry[]; onSaveRecipe: (items: FoodEntry[]) => void }) {
  const s = useStore()
  const yesterday = addDays(day, -1)
  const yItems = s.foods.filter((f) => f.date === yesterday && f.meal === meal)
  if (!items.length && !yItems.length) return null
  return (
    <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
      {items.length > 1 && (
        <button className="btn ghost sm" onClick={() => onSaveRecipe(items)}>
          Als Rezept speichern
        </button>
      )}
      {yItems.length > 0 && (
        <button
          className="btn ghost sm"
          onClick={() => {
            const n = s.copyMeal(yesterday, day, meal)
            toast(`${n} Einträge von gestern übernommen`)
          }}
        >
          Wie gestern ({Math.round(yItems.reduce((a, f) => a + macrosOf(f).kcal, 0))} kcal)
        </button>
      )}
    </div>
  )
}

