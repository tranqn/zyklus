import { useState } from 'react'
import { macrosOf, totals } from '../domain/nutrition'
import type { FoodEntry, Meal, Recipe } from '../domain/types'
import { addDays, uid } from '../domain/util'
import { useStore } from '../store'
import { Icon, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { getLang, t as tr, useT } from '../i18n'

/** Save the entries of one meal as a reusable recipe. */
export function SaveRecipeSheet({ items, onClose }: { items: FoodEntry[] | null; onClose: () => void }) {
  const saveRecipe = useStore((s) => s.saveRecipe)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(1)
  if (!items) return null
  const tot = totals(items)
  return (
    <Sheet open onClose={onClose} title={tr('nutrition.recipe.saveTitle')}>
      <div className="stack lg">
        <p className="small muted">{tr('nutrition.recipe.saveIntro', { n: items.length, kcal: Math.round(tot.kcal) })}</p>
        <div className="field">
          <label htmlFor="rname">{tr('nutrition.recipe.name')}</label>
          <input id="rname" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('nutrition.recipe.namePlaceholder')} autoFocus />
        </div>
        <div className="stack">
          <span className="label">{tr('nutrition.recipe.servings')}</span>
          <Stepper label={tr('nutrition.recipe.servingsLabel')} value={servings} onChange={setServings} min={1} max={20} />
          {servings > 1 && <p className="tiny muted">{tr('nutrition.recipe.perServing', { kcal: Math.round(tot.kcal / servings) })}</p>}
        </div>
        <button
          className="btn primary block"
          disabled={!name.trim()}
          onClick={() => {
            saveRecipe({ id: uid(), name: name.trim(), servings, items: items.map(({ foodId, name: n, grams, per100 }) => ({ foodId, name: n, grams, per100 })) })
            toast(tr('nutrition.recipe.saved'))
            onClose()
          }}
        >
          {tr('common.save')}
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
    return <p className="empty small">{tr('nutrition.recipe.none')}</p>
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
          <span className="label">{tr('nutrition.recipe.portions')}</span>
          <Stepper label={tr('nutrition.recipe.portions')} value={portions} onChange={setPortions} step={0.5} min={0.5} max={10} />
        </div>
        <p className="small num">{tr('nutrition.recipe.approxKcal', { kcal: Math.round(perPortion * portions) })}</p>
        <div className="row">
          <button className="btn grow" onClick={() => setPicked(null)}>
            {tr('common.back')}
          </button>
          <button
            className="btn primary grow"
            onClick={() => {
              s.logRecipe(picked, portions, day, meal)
              toast(tr('nutrition.logged', { name: picked.name }))
              onDone()
            }}
          >
            {tr('nutrition.log')}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="card list" style={{ padding: '0 16px' }}>
      {s.recipes.map((r) => {
        const tot = totals(r.items)
        return (
          <div key={r.id} className="list-item">
            <button className="grow" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => (setPicked(r), setPortions(1))}>
              <strong>{r.name}</strong>
              <span className="small muted" style={{ display: 'block' }}>
                {tr('nutrition.recipe.perServingMeta', { kcal: Math.round(tot.kcal / r.servings), p: Math.round(tot.protein / r.servings) })}
              </span>
            </button>
            <button className="icon-btn plain" aria-label={tr('nutrition.recipe.deleteLabel', { name: r.name })} onClick={() => confirmAction(tr('nutrition.recipe.deleteConfirm', { name: r.name })) && s.removeRecipe(r.id)}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

type PresetKey = 'kreatin' | 'vitd' | 'omega3' | 'magnesium' | 'whey' | 'zink' | 'koffein'
const PRESETS: [PresetKey, string][] = [
  ['kreatin', '5 g'],
  ['vitd', '1.000 IE'],
  ['omega3', '1 g EPA/DHA'],
  ['magnesium', '300 mg'],
  ['whey', '30 g'],
  ['zink', '10 mg'],
  ['koffein', '200 mg'],
]
/** preset name and dose in the current language (IE is IU outside German) */
const preset = ([k, dose]: [PresetKey, string]) => ({
  name: tr(`nutrition.supplements.preset.${k}`),
  dose: getLang() === 'de' ? dose : dose.replace('IE', 'IU').replace('1.000', getLang() === 'en' ? '1,000' : '1.000'),
})

export function SupplementsCard({ day }: { day: string }) {
  const s = useStore()
  const [manage, setManage] = useState(false)
  const taken = s.supplementLog[day] ?? []
  const { t } = useT()
  return (
    <section className="card stack">
      <div className="row between">
        <div>
          <h3>{t('nutrition.supplements.title')}</h3>
          {s.supplements.length > 0 && (
            <span className="small muted num">
              {t('nutrition.supplements.taken', { n: taken.filter((id) => s.supplements.some((x) => x.id === id)).length, total: s.supplements.length })}
            </span>
          )}
        </div>
        <button className="btn sm" onClick={() => setManage(true)}>
          {s.supplements.length ? t('nutrition.supplements.manage') : t('nutrition.supplements.add')}
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
    <Sheet open onClose={onClose} title={tr('nutrition.supplements.manageTitle')}>
      <div className="stack lg">
        {s.supplements.length > 0 && (
          <div className="card list" style={{ padding: '0 16px' }}>
            {s.supplements.map((sup) => (
              <div key={sup.id} className="list-item">
                <span className="grow">
                  <strong>{sup.name}</strong> <span className="small muted">{sup.dose}</span>
                </span>
                <button className="icon-btn plain" aria-label={tr('nutrition.supplements.remove', { name: sup.name })} onClick={() => s.removeSupplement(sup.id)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="stack">
          <span className="label">{tr('nutrition.supplements.quickAdd')}</span>
          <div className="row wrap">
            {PRESETS.map(preset)
              .filter((p) => !has(p.name))
              .map((p) => (
                <button key={p.name} className="chip" onClick={() => s.addSupplement(p)}>
                  <Icon name="plus" size={14} /> {p.name}
                </button>
              ))}
          </div>
        </div>
        <div className="stack">
          <span className="label">{tr('nutrition.supplements.own')}</span>
          <div className="grid2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('nutrition.supplements.name')} aria-label={tr('nutrition.supplements.nameLabel')} />
            <input className="input" value={dose} onChange={(e) => setDose(e.target.value)} placeholder={tr('nutrition.supplements.dose')} aria-label={tr('nutrition.supplements.dose')} />
          </div>
          <button
            className="btn"
            disabled={!name.trim()}
            onClick={() => {
              s.addSupplement({ name: name.trim(), dose: dose.trim() || tr('nutrition.supplements.onePortion') })
              setName('')
              setDose('')
            }}
          >
            {tr('nutrition.supplements.add')}
          </button>
        </div>
        <p className="tiny muted">{tr('nutrition.supplements.note')}</p>
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
          {tr('nutrition.recipe.saveTitle')}
        </button>
      )}
      {yItems.length > 0 && (
        <button
          className="btn ghost sm"
          onClick={() => {
            const n = s.copyMeal(yesterday, day, meal)
            toast(tr('nutrition.recipe.copied', { n }))
          }}
        >
          {tr('nutrition.recipe.sameAsYesterday', { kcal: Math.round(yItems.reduce((a, f) => a + macrosOf(f).kcal, 0)) })}
        </button>
      )}
    </div>
  )
}

