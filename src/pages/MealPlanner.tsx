import { useState } from 'react'
import { foodName, FOODS } from '../domain/foods'
import { DEFAULT_MEAL_PREFS, DISH_BY_ID, DISHES, dishAllowed, dishItems, dishMacros, hashSeed, planDays, shoppingList, SHOP_ORDER, suggestDishes, type Dish, type Diet, type MealPrefs, type PlannedMeal } from '../domain/meals'
import { targets, totals } from '../domain/nutrition'
import type { FoodEntry, Macros, Meal } from '../domain/types'
import { addDays, fmt, formatDate, startOfWeek, today } from '../domain/util'
import { useStore } from '../store'
import { Bar, Icon, Segmented, Sheet } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { t as tr, tk as tkr, useT, weekdaysShort } from '../i18n'
import { dishName, dishSteps, extraName } from '../i18n/content/dishes'

const FOOD_MAP = new Map(FOODS.map((f) => [f.id, f]))
/** foods bought by the piece: the shopping list shows a count next to the grams */
const PIECES = new Set(['ei', 'banane', 'avocado'])
const SLOTS: Meal[] = ['fruehstueck', 'mittag', 'abend', 'snack']
const mealName = (m: Meal) => tr(`nutrition.meal.${m}` as 'nutrition.meal.mittag')

function usePrefs(): MealPrefs {
  return { ...DEFAULT_MEAL_PREFS, ...useStore((s) => s.settings.mealPrefs) }
}

/** Diary entries for one planned dish (names in the current language). */
function entriesFor(dish: Dish, factor: number, prefs: MealPrefs, date: string, meal: Meal, lang: 'de' | 'en' | 'vi'): Omit<FoodEntry, 'id'>[] {
  return dishItems(dish, prefs, factor).flatMap(({ foodId, grams }) => {
    const f = FOOD_MAP.get(foodId)
    return f ? [{ date, meal, foodId, name: foodName(f, lang), grams, per100: f.per100 }] : []
  })
}

/** a new seed per click, so "suggest again" really gives a different week */
const freshSeed = (weekStart: string) => hashSeed(`${weekStart}:${Date.now()}`)

function mealNow(): Meal {
  const hour = new Date().getHours()
  return hour < 10 ? 'fruehstueck' : hour < 14 ? 'mittag' : hour < 17 ? 'snack' : 'abend'
}

const factorText = (f: number) => tr('planner.portions', { f: fmt(f, 2), n: f })

export default function MealPlanner() {
  const s = useStore()
  const { t, lang } = useT()
  const prefs = usePrefs()
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = addDays(startOfWeek(today()), weekOffset * 7)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const [picked, setPicked] = useState(() => (dates.includes(today()) ? today() : weekStart))
  const day = dates.includes(picked) ? picked : dates[0]
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [recipe, setRecipe] = useState<{ dishId: string; factor: number } | null>(null)
  const [swap, setSwap] = useState<PlannedMeal | null>(null)
  const goal = targets(s.profile!, s.settings.kcalOverride, s.kcalAdjustment)
  const week = s.mealPlan.filter((p) => p.date >= weekStart && p.date < addDays(weekStart, 7))
  const dayMeals = week.filter((p) => p.date === day).sort((a, b) => SLOTS.indexOf(a.meal) - SLOTS.indexOf(b.meal) || a.id.localeCompare(b.id))
  const macrosOf = (p: PlannedMeal) => (DISH_BY_ID.get(p.dishId) ? dishMacros(DISH_BY_ID.get(p.dishId)!, FOOD_MAP, prefs, p.factor) : { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const dayTotal = dayMeals.map(macrosOf).reduce<Macros>((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const generate = () => {
    // days that are over keep what was planned; the rest of the week is planned fresh
    const open = dates.filter((d) => d >= today())
    const before = s.mealPlan.filter((p) => p.date < open[0] && p.date >= addDays(open[0], -7))
    const plan = planDays(open, goal, prefs, FOOD_MAP, { seed: freshSeed(weekStart), before })
    s.setMealPlan(open, plan)
  }

  const log = (p: PlannedMeal) => {
    const dish = DISH_BY_ID.get(p.dishId)
    if (!dish) return
    s.logPlannedMeal(p.id, entriesFor(dish, p.factor, prefs, p.date, p.meal, lang))
    toast(tr('planner.loggedToast', { dish: dishName(p.dishId) }))
  }

  const tags = [tr(`planner.dietOpt.${prefs.diet}`), prefs.lactoseFree && tr('planner.lactoseFree'), prefs.noNuts && tr('planner.noNuts'), prefs.noPork && tr('planner.noPork'), prefs.mealPrep && 'Meal-Prep'].filter(Boolean) as string[]
  const wd = weekdaysShort()

  return (
    <>
      <div className="card stack">
        <div className="row between">
          <div>
            <h3>{t('planner.title')}</h3>
            <span className="tiny muted">{weekOffset === 0 ? t('planner.thisWeek') : t('planner.nextWeek')} · {t('planner.weekOf', { date: formatDate(weekStart) })}</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className="icon-btn" aria-label={t('planner.thisWeek')} disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>
              <Icon name="back" size={18} />
            </button>
            <button className="icon-btn" aria-label={t('planner.nextWeek')} disabled={weekOffset === 1} onClick={() => setWeekOffset(1)}>
              <Icon name="chevron" size={18} />
            </button>
          </div>
        </div>
        <button className="row wrap" style={{ gap: 6, background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setPrefsOpen(true)} aria-label={t('planner.prefs')}>
          {tags.map((x) => (
            <span key={x} className="badge">
              {x}
            </span>
          ))}
          <span className="badge accent">
            <Icon name="settings" size={12} /> {t('planner.prefs')}
          </span>
        </button>
        {week.length === 0 ? (
          <>
            <p className="small muted">{t('planner.empty', { kcal: fmt(goal.kcal), protein: goal.protein })}</p>
            <button
              className="btn primary block"
              onClick={() => {
                generate()
                toast(tr('planner.created'))
              }}
            >
              <Icon name="sparkle" size={18} /> {t('planner.create')}
            </button>
          </>
        ) : (
          <div className="planner-actions">
            <button className="btn sm" onClick={() => setShopOpen(true)}>
              <Icon name="check" size={18} /> {t('planner.shopping')}
            </button>
            <button className="btn sm" onClick={() => confirmAction(tr('planner.regenerateConfirm')) && generate()}>
              <Icon name="swap" size={18} /> {t('planner.regenerate')}
            </button>
          </div>
        )}
      </div>

      {week.length > 0 && (
        <>
          <div className="planner-days" role="group" aria-label={t('planner.title')}>
            {dates.map((d, i) => {
              const has = week.some((p) => p.date === d)
              return (
                <button key={d} className="chip" aria-pressed={d === day} onClick={() => setPicked(d)} style={{ opacity: has || d >= today() ? 1 : 0.5 }}>
                  <span style={{ display: 'block', fontSize: '0.7rem' }}>{wd[i]}</span>
                  <span className="num">{Number(d.slice(8))}</span>
                </button>
              )
            })}
          </div>

          <div className="card stack" style={{ gap: 8 }}>
            <div className="row between small">
              <span className="muted">{t('planner.planned')}</span>
              <strong className="num">
                {fmt(Math.round(dayTotal.kcal))} / {fmt(goal.kcal)} kcal
              </strong>
            </div>
            <Bar value={dayTotal.kcal} max={goal.kcal} />
            <div className="row between tiny muted num">
              <span>
                {t('common.protein')} {Math.round(dayTotal.protein)}/{goal.protein} g
              </span>
              <span>
                {t('common.carbsShort')} {Math.round(dayTotal.carbs)} g
              </span>
              <span>
                {t('common.fat')} {Math.round(dayTotal.fat)} g
              </span>
            </div>
          </div>

          {dayMeals.map((p) => {
            const dish = DISH_BY_ID.get(p.dishId)
            if (!dish) return null
            const m = macrosOf(p)
            const name = dishName(p.dishId)
            return (
              <section key={p.id} className="card stack" style={{ gap: 10 }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <div className="eyebrow">{mealName(p.meal)}</div>
                    <h3 style={{ overflowWrap: 'anywhere' }}>{name}</h3>
                    <span className="small muted num">
                      {fmt(Math.round(m.kcal))} kcal · {Math.round(m.protein)} g {t('common.protein')} · {factorText(p.factor)} · {t('planner.minutes', { n: dish.minutes })}
                    </span>
                  </div>
                  {p.logged && <span className="badge ok">{t('planner.logged')}</span>}
                </div>
                <div className="planner-actions">
                  <button className="btn sm" onClick={() => setRecipe({ dishId: p.dishId, factor: p.factor })} aria-label={t('planner.recipeFor', { dish: name })}>
                    {t('planner.recipe')}
                  </button>
                  {!p.logged && (
                    <button className="btn sm" onClick={() => setSwap(p)} aria-label={t('planner.swapFor', { dish: name })}>
                      <Icon name="swap" size={16} /> {t('planner.swap')}
                    </button>
                  )}
                  {!p.logged && p.date <= today() && (
                    <button className="btn sm primary" onClick={() => log(p)} aria-label={t('planner.logFor', { dish: name })}>
                      <Icon name="plus" size={16} /> {t('planner.log')}
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </>
      )}

      {weekOffset === 0 && <SuggestionsCard goal={goal} prefs={prefs} onRecipe={setRecipe} />}

      <p className="tiny muted" style={{ padding: '0 4px' }}>
        {t('planner.proteinRule', { g: Math.round((s.profile!.weightKg * 0.4) / 5) * 5 })} {t('planner.valuesNote')}
      </p>

      <PrefsSheet key={prefsOpen ? 'offen' : 'zu'} open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <RecipeSheet recipe={recipe} prefs={prefs} onClose={() => setRecipe(null)} />
      <SwapSheet planned={swap} prefs={prefs} onClose={() => setSwap(null)} />
      <ShoppingSheet open={shopOpen} weekStart={weekStart} week={week} prefs={prefs} onClose={() => setShopOpen(false)} />
    </>
  )
}

function SuggestionsCard({ goal, prefs, onRecipe }: { goal: Macros; prefs: MealPrefs; onRecipe: (r: { dishId: string; factor: number }) => void }) {
  const s = useStore()
  const { t, lang } = useT()
  const eaten = totals(s.foods.filter((f) => f.date === today()))
  const remaining = { kcal: goal.kcal - eaten.kcal, protein: Math.max(0, goal.protein - eaten.protein), carbs: goal.carbs - eaten.carbs, fat: goal.fat - eaten.fat }
  // one meal at a time: at most a third of the day, even when nothing is logged yet
  const list = suggestDishes({ ...remaining, kcal: Math.min(remaining.kcal, goal.kcal / 3), protein: Math.min(remaining.protein, goal.protein / 3) }, prefs, FOOD_MAP)
  const meal = mealNow()
  return (
    <div className="card stack">
      <h3>{t('planner.suggestTitle')}</h3>
      {list.length === 0 ? (
        <p className="small muted">{t('planner.suggestDone')}</p>
      ) : (
        <>
          <p className="small muted num">{t('planner.suggestOpen', { kcal: fmt(Math.round(remaining.kcal)), protein: Math.round(remaining.protein) })}</p>
          <div className="list">
            {list.map((x) => {
              const name = dishName(x.dish.id)
              return (
                <div key={x.dish.id} className="list-item" style={{ alignItems: 'center' }}>
                  <button className="grow" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit' }} onClick={() => onRecipe({ dishId: x.dish.id, factor: x.factor })} aria-label={t('planner.recipeFor', { dish: name })}>
                    <span style={{ fontWeight: 600, display: 'block', overflowWrap: 'anywhere' }}>{name}</span>
                    <span className="small muted num">
                      {fmt(Math.round(x.macros.kcal))} kcal · {Math.round(x.macros.protein)} g · {factorText(x.factor)}
                    </span>
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={t('planner.toDiaryFor', { dish: name })}
                    onClick={() => {
                      s.addFoods(entriesFor(x.dish, x.factor, prefs, today(), meal, lang))
                      toast(tr('planner.loggedToast', { dish: name }))
                    }}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function RecipeSheet({ recipe, prefs, onClose }: { recipe: { dishId: string; factor: number } | null; prefs: MealPrefs; onClose: () => void }) {
  const { t, lang } = useT()
  const dish = recipe ? DISH_BY_ID.get(recipe.dishId) : undefined
  const m = dish ? dishMacros(dish, FOOD_MAP, prefs, recipe!.factor) : undefined
  const usesDairy = !!dish && prefs.lactoseFree && dish.items.some(([id]) => id === 'milch-15' || id === 'skyr' || id === 'magerquark')
  return (
    <Sheet open={!!dish} onClose={onClose} title={dish ? dishName(dish.id) : ''}>
      {dish && m && (
        <div className="stack">
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="badge">{tkr(`planner.cuisine.${dish.cuisine}`)}</span>
            <span className="badge">{t('planner.minutes', { n: dish.minutes })}</span>
            {dish.keeps && dish.keeps > 1 && <span className="badge">{t('planner.keeps', { n: dish.keeps })}</span>}
            <span className="badge accent">{factorText(recipe!.factor)}</span>
          </div>
          <div className="grid3 small num" style={{ textAlign: 'center' }}>
            <span>
              <strong style={{ display: 'block', fontSize: '1.2rem' }}>{fmt(Math.round(m.kcal))}</strong>kcal
            </span>
            <span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--protein)' }}>{Math.round(m.protein)} g</strong>
              {t('common.protein')}
            </span>
            <span>
              <strong style={{ display: 'block', fontSize: '1.2rem' }}>
                {Math.round(m.carbs)}/{Math.round(m.fat)}
              </strong>
              {t('common.carbsShort')}/{t('common.fat')} g
            </span>
          </div>
          <h3>{t('planner.ingredients')}</h3>
          <div className="list">
            {dishItems(dish, prefs, recipe!.factor).map(({ foodId, grams }) => (
              <div key={foodId} className="list-item" style={{ minHeight: 40, padding: '8px 0' }}>
                <span className="grow" style={{ overflowWrap: 'anywhere' }}>
                  {FOOD_MAP.get(foodId) ? foodName(FOOD_MAP.get(foodId)!, lang) : foodId}
                </span>
                <span className="num muted">{fmt(grams)} g</span>
              </div>
            ))}
          </div>
          {dish.extras && <p className="small muted">{t('planner.also', { list: dish.extras.map((e) => extraName(e)).join(', ') })}</p>}
          {usesDairy && <p className="small muted">{t('planner.lactoseNote')}</p>}
          <h3>{t('planner.steps')}</h3>
          <ol className="stack small" style={{ paddingLeft: 20, margin: 0, gap: 6 }}>
            {dishSteps(dish.id).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
      )}
    </Sheet>
  )
}

function SwapSheet({ planned, prefs, onClose }: { planned: PlannedMeal | null; prefs: MealPrefs; onClose: () => void }) {
  const s = useStore()
  const { t } = useT()
  const current = planned && DISH_BY_ID.get(planned.dishId)
  const kcal = current ? dishMacros(current, FOOD_MAP, prefs, planned!.factor).kcal : 0
  const options = current
    ? DISHES.filter((d) => d.id !== current.id && d.slots.includes(planned!.meal) && dishAllowed(d, prefs))
        .map((d) => {
          const base = dishMacros(d, FOOD_MAP, prefs).kcal
          const factor = Math.min(1.8, Math.max(0.6, Math.round((kcal / base) * 20) / 20))
          return { d, factor, m: dishMacros(d, FOOD_MAP, prefs, factor) }
        })
        .sort((a, b) => Math.abs(a.m.kcal - kcal) - Math.abs(b.m.kcal - kcal) || b.m.protein - a.m.protein)
        .slice(0, 8)
    : []
  return (
    <Sheet open={!!current} onClose={onClose} title={t('planner.swapTitle')}>
      <p className="small muted">{t('planner.swapHint')}</p>
      <div className="list">
        {options.map(({ d, factor, m }) => (
          <button
            key={d.id}
            className="list-item"
            onClick={() => {
              s.updatePlannedMeal(planned!.id, { dishId: d.id, factor })
              toast(tr('planner.swapped'))
              onClose()
            }}
          >
            <span className="grow">
              <span style={{ fontWeight: 600, display: 'block', overflowWrap: 'anywhere' }}>{dishName(d.id)}</span>
              <span className="small muted num">
                {fmt(Math.round(m.kcal))} kcal · {Math.round(m.protein)} g {t('common.protein')} · {t('planner.minutes', { n: d.minutes })}
              </span>
            </span>
            <span className="small muted">{factorText(factor)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function ShoppingSheet({ open, weekStart, week, prefs, onClose }: { open: boolean; weekStart: string; week: PlannedMeal[]; prefs: MealPrefs; onClose: () => void }) {
  const s = useStore()
  const { t, lang } = useT()
  const [range, setRange] = useState<'rest' | 'week'>('rest')
  const meals = week.filter((p) => !p.logged && (range === 'week' || p.date >= today()))
  const { items, extras } = shoppingList(meals, prefs)
  const checked = new Set(s.shoppingChecked)
  const row = (k: string, label: string, amount?: string) => {
    const on = checked.has(k)
    return (
      <label key={k} className="list-item" style={{ minHeight: 44, padding: '6px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={on} onChange={() => s.toggleShopping(k)} style={{ width: 22, height: 22, accentColor: 'var(--ok)' }} />
        <span className="grow" style={{ textDecoration: on ? 'line-through' : undefined, opacity: on ? 0.55 : 1, overflowWrap: 'anywhere' }}>
          {label}
        </span>
        {amount && <span className="num muted small">{amount}</span>}
      </label>
    )
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('planner.shopping')}>
      <div className="stack">
        <Segmented
          value={range}
          onChange={setRange}
          label={t('planner.shopping')}
          options={[
            { value: 'rest', label: t('planner.rangeRest') },
            { value: 'week', label: t('planner.rangeWeek') },
          ]}
        />
        {items.length === 0 ? (
          <p className="small muted">{t('planner.shoppingEmpty')}</p>
        ) : (
          <>
            {SHOP_ORDER.map((cat) => {
              const rows = items.filter((i) => i.category === cat)
              if (!rows.length) return null
              return (
                <div key={cat}>
                  <h3 style={{ marginTop: 4 }}>{tkr(`planner.cat.${cat}`)}</h3>
                  <div className="list">
                    {rows.map((i) => {
                      const f = FOOD_MAP.get(i.foodId)
                      const g = i.grams >= 20 ? Math.ceil(i.grams / 10) * 10 : i.grams
                      const pieces = PIECES.has(i.foodId) && f?.portion ? ` · ${t('planner.pieces', { n: Math.ceil(i.grams / f.portion) })}` : ''
                      return row(`${weekStart}:${i.foodId}`, f ? foodName(f, lang) : i.foodId, `${fmt(g)} g${pieces}`)
                    })}
                  </div>
                </div>
              )
            })}
            {extras.length > 0 && (
              <div>
                <h3 style={{ marginTop: 4 }}>{t('planner.shoppingExtras')}</h3>
                <div className="list">
                  {extras.map((e) => row(`${weekStart}:x:${e}`, extraName(e)))}
                </div>
              </div>
            )}
            <p className="tiny muted">{t('planner.shoppingHint')}</p>
          </>
        )}
      </div>
    </Sheet>
  )
}

function PrefsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore()
  const { t } = useT()
  const [p, setP] = useState<MealPrefs>({ ...DEFAULT_MEAL_PREFS, ...s.settings.mealPrefs })
  const toggle = (k: 'lactoseFree' | 'noNuts' | 'noPork' | 'quick' | 'mealPrep') => (
    <label key={k} className="row between" style={{ minHeight: 44, gap: 12 }}>
      <span>{t(`planner.${k}`)}</span>
      <input type="checkbox" role="switch" checked={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} style={{ width: 22, height: 22, accentColor: 'var(--accent)', flexShrink: 0 }} />
    </label>
  )
  const diets: Diet[] = ['alles', 'pescetarisch', 'vegetarisch', 'vegan']
  return (
    <Sheet open={open} onClose={onClose} title={t('planner.prefsTitle')}>
      <div className="stack">
        <div className="field">
          <span className="small" style={{ fontWeight: 650 }}>
            {t('planner.diet')}
          </span>
          <div className="row wrap" style={{ gap: 8 }} role="group" aria-label={t('planner.diet')}>
            {diets.map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={p.diet === d} onClick={() => setP({ ...p, diet: d })}>
                {t(`planner.dietOpt.${d}`)}
              </button>
            ))}
          </div>
        </div>
        <div>{(['lactoseFree', 'noNuts', 'noPork', 'quick', 'mealPrep'] as const).map(toggle)}</div>
        <p className="tiny muted">{t('planner.prefsHint')}</p>
        <button
          className="btn primary block"
          onClick={() => {
            s.updateSettings({ mealPrefs: p })
            toast(tr('planner.saved'))
            onClose()
          }}
        >
          {t('planner.save')}
        </button>
      </div>
    </Sheet>
  )
}
