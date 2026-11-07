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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3>{t('planner.title')}</h3>
            <span className="text-xs text-muted-foreground">{weekOffset === 0 ? t('planner.thisWeek') : t('planner.nextWeek')} · {t('planner.weekOf', { date: formatDate(weekStart) })}</span>
          </div>
          <div className="flex items-center gap-2" style={{ gap: 4 }}>
            <Button variant="secondary" size="icon" aria-label={t('planner.thisWeek')} disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>
              <Icon name="back" size={18} />
            </Button>
            <Button variant="secondary" size="icon" aria-label={t('planner.nextWeek')} disabled={weekOffset === 1} onClick={() => setWeekOffset(1)}>
              <Icon name="chevron" size={18} />
            </Button>
          </div>
        </div>
        <button className="flex items-center flex-wrap gap-2" style={{ gap: 6, background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setPrefsOpen(true)} aria-label={t('planner.prefs')}>
          {tags.map((x) => (
            <Badge key={x}>
              {x}
            </Badge>
          ))}
          <Badge variant="accent">
            <Icon name="settings" size={12} /> {t('planner.prefs')}
          </Badge>
        </button>
        {week.length === 0 ? (
          <>
            <p className="text-[0.85rem] text-muted-foreground">{t('planner.empty', { kcal: fmt(goal.kcal), protein: goal.protein })}</p>
            <Button
              className="w-full whitespace-normal text-center leading-tight py-2.5"
              onClick={() => {
                generate()
                toast(tr('planner.created'))
              }}
            >
              <Icon name="sparkle" size={18} /> {t('planner.create')}
            </Button>
          </>
        ) : (
          <div className="planner-actions">
            <Button variant="secondary" size="sm" onClick={() => setShopOpen(true)}>
              <Icon name="check" size={18} /> {t('planner.shopping')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => confirmAction(tr('planner.regenerateConfirm')) && generate()}>
              <Icon name="swap" size={18} /> {t('planner.regenerate')}
            </Button>
          </div>
        )}
      </Card>

      {week.length > 0 && (
        <>
          <div className="planner-days" role="group" aria-label={t('planner.title')}>
            {dates.map((d, i) => {
              const has = week.some((p) => p.date === d)
              return (
                <Button variant="chip" key={d} aria-pressed={d === day} onClick={() => setPicked(d)} style={{ opacity: has || d >= today() ? 1 : 0.5 }}>
                  <span style={{ display: 'block', fontSize: '0.7rem' }}>{wd[i]}</span>
                  <span className="tabular-nums">{Number(d.slice(8))}</span>
                </Button>
              )
            })}
          </div>

          <Card className="flex flex-col gap-2" style={{ gap: 8 }}>
            <div className="flex items-center justify-between gap-2 text-[0.85rem]">
              <span className="text-muted-foreground">{t('planner.planned')}</span>
              <strong className="tabular-nums">
                {fmt(Math.round(dayTotal.kcal))} / {fmt(goal.kcal)} kcal
              </strong>
            </div>
            <Bar value={dayTotal.kcal} max={goal.kcal} />
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
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
          </Card>

          {dayMeals.map((p) => {
            const dish = DISH_BY_ID.get(p.dishId)
            if (!dish) return null
            const m = macrosOf(p)
            const name = dishName(p.dishId)
            return (
              <Card key={p.id} className="flex flex-col gap-2" style={{ gap: 10 }}>
                <div className="flex items-center justify-between gap-2" style={{ alignItems: 'flex-start' }}>
                  <div className="min-w-0 flex-1">
                    <div className="eyebrow">{mealName(p.meal)}</div>
                    <h3 style={{ overflowWrap: 'anywhere' }}>{name}</h3>
                    <span className="text-[0.85rem] text-muted-foreground tabular-nums">
                      {fmt(Math.round(m.kcal))} kcal · {Math.round(m.protein)} g {t('common.protein')} · {factorText(p.factor)} · {t('planner.minutes', { n: dish.minutes })}
                    </span>
                  </div>
                  {p.logged && <Badge variant="ok">{t('planner.logged')}</Badge>}
                </div>
                <div className="planner-actions">
                  <Button variant="secondary" size="sm" onClick={() => setRecipe({ dishId: p.dishId, factor: p.factor })} aria-label={t('planner.recipeFor', { dish: name })}>
                    {t('planner.recipe')}
                  </Button>
                  {!p.logged && (
                    <Button variant="secondary" size="sm" onClick={() => setSwap(p)} aria-label={t('planner.swapFor', { dish: name })}>
                      <Icon name="swap" size={16} /> {t('planner.swap')}
                    </Button>
                  )}
                  {!p.logged && p.date <= today() && (
                    <Button size="sm" onClick={() => log(p)} aria-label={t('planner.logFor', { dish: name })}>
                      <Icon name="plus" size={16} /> {t('planner.log')}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </>
      )}

      {weekOffset === 0 && <SuggestionsCard goal={goal} prefs={prefs} onRecipe={setRecipe} />}

      <p className="text-xs text-muted-foreground" style={{ padding: '0 4px' }}>
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
    <Card className="flex flex-col gap-2">
      <h3>{t('planner.suggestTitle')}</h3>
      {list.length === 0 ? (
        <p className="text-[0.85rem] text-muted-foreground">{t('planner.suggestDone')}</p>
      ) : (
        <>
          <p className="text-[0.85rem] text-muted-foreground tabular-nums">{t('planner.suggestOpen', { kcal: fmt(Math.round(remaining.kcal)), protein: Math.round(remaining.protein) })}</p>
          <div className="flex flex-col divide-y divide-border">
            {list.map((x) => {
              const name = dishName(x.dish.id)
              return (
                <div key={x.dish.id} className="list-row" style={{ alignItems: 'center' }}>
                  <button className="min-w-0 flex-1" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit' }} onClick={() => onRecipe({ dishId: x.dish.id, factor: x.factor })} aria-label={t('planner.recipeFor', { dish: name })}>
                    <span style={{ fontWeight: 600, display: 'block', overflowWrap: 'anywhere' }}>{name}</span>
                    <span className="text-[0.85rem] text-muted-foreground tabular-nums">
                      {fmt(Math.round(x.macros.kcal))} kcal · {Math.round(x.macros.protein)} g · {factorText(x.factor)}
                    </span>
                  </button>
                  <Button variant="secondary" size="icon"
                   
                    aria-label={t('planner.toDiaryFor', { dish: name })}
                    onClick={() => {
                      s.addFoods(entriesFor(x.dish, x.factor, prefs, today(), meal, lang))
                      toast(tr('planner.loggedToast', { dish: name }))
                    }}
                  >
                    <Icon name="plus" />
                  </Button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Card>
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center flex-wrap gap-2" style={{ gap: 6 }}>
            <Badge>{tkr(`planner.cuisine.${dish.cuisine}`)}</Badge>
            <Badge>{t('planner.minutes', { n: dish.minutes })}</Badge>
            {dish.keeps && dish.keeps > 1 && <Badge>{t('planner.keeps', { n: dish.keeps })}</Badge>}
            <Badge variant="accent">{factorText(recipe!.factor)}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[0.85rem] tabular-nums" style={{ textAlign: 'center' }}>
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
          <div className="flex flex-col divide-y divide-border">
            {dishItems(dish, prefs, recipe!.factor).map(({ foodId, grams }) => (
              <div key={foodId} className="list-row" style={{ minHeight: 40, padding: '8px 0' }}>
                <span className="min-w-0 flex-1" style={{ overflowWrap: 'anywhere' }}>
                  {FOOD_MAP.get(foodId) ? foodName(FOOD_MAP.get(foodId)!, lang) : foodId}
                </span>
                <span className="tabular-nums text-muted-foreground">{fmt(grams)} g</span>
              </div>
            ))}
          </div>
          {dish.extras && <p className="text-[0.85rem] text-muted-foreground">{t('planner.also', { list: dish.extras.map((e) => extraName(e)).join(', ') })}</p>}
          {usesDairy && <p className="text-[0.85rem] text-muted-foreground">{t('planner.lactoseNote')}</p>}
          <h3>{t('planner.steps')}</h3>
          <ol className="flex flex-col gap-2 text-[0.85rem]" style={{ paddingLeft: 20, margin: 0, gap: 6 }}>
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
      <p className="text-[0.85rem] text-muted-foreground">{t('planner.swapHint')}</p>
      <div className="flex flex-col divide-y divide-border">
        {options.map(({ d, factor, m }) => (
          <button
            key={d.id}
            className="list-row"
            onClick={() => {
              s.updatePlannedMeal(planned!.id, { dishId: d.id, factor })
              toast(tr('planner.swapped'))
              onClose()
            }}
          >
            <span className="min-w-0 flex-1">
              <span style={{ fontWeight: 600, display: 'block', overflowWrap: 'anywhere' }}>{dishName(d.id)}</span>
              <span className="text-[0.85rem] text-muted-foreground tabular-nums">
                {fmt(Math.round(m.kcal))} kcal · {Math.round(m.protein)} g {t('common.protein')} · {t('planner.minutes', { n: d.minutes })}
              </span>
            </span>
            <span className="text-[0.85rem] text-muted-foreground">{factorText(factor)}</span>
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
      <label key={k} className="list-row" style={{ minHeight: 44, padding: '6px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={on} onChange={() => s.toggleShopping(k)} style={{ width: 22, height: 22, accentColor: 'var(--ok)' }} />
        <span className="min-w-0 flex-1" style={{ textDecoration: on ? 'line-through' : undefined, opacity: on ? 0.55 : 1, overflowWrap: 'anywhere' }}>
          {label}
        </span>
        {amount && <span className="tabular-nums text-muted-foreground text-[0.85rem]">{amount}</span>}
      </label>
    )
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('planner.shopping')}>
      <div className="flex flex-col gap-2">
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
          <p className="text-[0.85rem] text-muted-foreground">{t('planner.shoppingEmpty')}</p>
        ) : (
          <>
            {SHOP_ORDER.map((cat) => {
              const rows = items.filter((i) => i.category === cat)
              if (!rows.length) return null
              return (
                <div key={cat}>
                  <h3 style={{ marginTop: 4 }}>{tkr(`planner.cat.${cat}`)}</h3>
                  <div className="flex flex-col divide-y divide-border">
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
                <div className="flex flex-col divide-y divide-border">
                  {extras.map((e) => row(`${weekStart}:x:${e}`, extraName(e)))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('planner.shoppingHint')}</p>
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
    <label key={k} className="flex items-center justify-between gap-2" style={{ minHeight: 44, gap: 12 }}>
      <span>{t(`planner.${k}`)}</span>
      <input type="checkbox" role="switch" checked={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} style={{ width: 22, height: 22, accentColor: 'var(--accent)', flexShrink: 0 }} />
    </label>
  )
  const diets: Diet[] = ['alles', 'pescetarisch', 'vegetarisch', 'vegan']
  return (
    <Sheet open={open} onClose={onClose} title={t('planner.prefsTitle')}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.85rem]" style={{ fontWeight: 650 }}>
            {t('planner.diet')}
          </span>
          <div className="flex items-center flex-wrap gap-2" style={{ gap: 8 }} role="group" aria-label={t('planner.diet')}>
            {diets.map((d) => (
              <Button variant="chip" key={d} type="button" aria-pressed={p.diet === d} onClick={() => setP({ ...p, diet: d })}>
                {t(`planner.dietOpt.${d}`)}
              </Button>
            ))}
          </div>
        </div>
        <div>{(['lactoseFree', 'noNuts', 'noPork', 'quick', 'mealPrep'] as const).map(toggle)}</div>
        <p className="text-xs text-muted-foreground">{t('planner.prefsHint')}</p>
        <Button
          className="w-full whitespace-normal text-center leading-tight py-2.5"
          onClick={() => {
            s.updateSettings({ mealPrefs: p })
            toast(tr('planner.saved'))
            onClose()
          }}
        >
          {t('planner.save')}
        </Button>
      </div>
    </Sheet>
  )
}
