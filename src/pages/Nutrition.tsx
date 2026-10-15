import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { macrosOf, normalize, parseMealText, suggestAdjustment, targets, totals, burnedToday, type ParsedItem } from '../domain/nutrition'
import type { BarcodeDetector as Ponyfill } from 'barcode-detector/ponyfill'
import { lookupBarcode, searchOff } from '../domain/openfoodfacts'
import type { Food, FoodEntry, Meal } from '../domain/types'
import { addDays, fmt, formatDate, today, uid } from '../domain/util'
import { allFoods, recentFoods, useStore } from '../store'
import { Bar, Icon, Ring, Segmented, Sheet } from '../ui/kit'
import { toast } from '../ui/notify'
import { MealActions, RecipeTab, SaveRecipeSheet, SupplementsCard } from './NutritionExtras'
import { getLang, t as tr, useT } from '../i18n'
import { foodName, foodPortion } from '../domain/foods'

const MEALS: Meal[] = ['fruehstueck', 'mittag', 'abend', 'snack']
const mealName = (m: Meal) => tr(`nutrition.meal.${m}` as 'nutrition.meal.mittag')
const signed = (n: number, digits = 0) => `${n > 0 ? '+' : ''}${fmt(n, digits)}`

function defaultMeal(): Meal {
  const h = new Date().getHours()
  return h < 11 ? 'fruehstueck' : h < 16 ? 'mittag' : h < 21 ? 'abend' : 'snack'
}

export default function Nutrition() {
  const s = useStore()
  const [day, setDay] = useState(today())
  const [addMeal, setAddMeal] = useState<Meal | null>(null)
  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null)
  const [recipeItems, setRecipeItems] = useState<FoodEntry[] | null>(null)
  const profile = s.profile!
  const { t } = useT()
  const goal = targets(profile, s.settings.kcalOverride, s.kcalAdjustment)
  const entries = s.foods.filter((f) => f.date === day)
  const tot = totals(entries)
  const burned = burnedToday(s.cardio, day)
  const budget = goal.kcal + burned
  const adj = suggestAdjustment(profile, s.weights)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{t('nutrition.eyebrow')}</div>
          <h1>{day === today() ? t('nutrition.today') : formatDate(day, { weekday: 'long', day: 'numeric', month: 'short' })}</h1>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn" aria-label={t('nutrition.prevDay')} onClick={() => setDay(addDays(day, -1))}>
            <Icon name="back" size={20} />
          </button>
          <button className="icon-btn" aria-label={t('nutrition.nextDay')} onClick={() => setDay(addDays(day, 1))} disabled={day >= today()}>
            <Icon name="chevron" size={20} />
          </button>
        </div>
      </div>

      <div className="card row" style={{ gap: 16 }}>
        <Ring value={tot.kcal} max={budget} size={116} stroke={11}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem' }} className="num">
              {fmt(Math.round(budget - tot.kcal))}
            </div>
            <div className="tiny muted">{budget - tot.kcal >= 0 ? t('common.kcalLeft') : t('common.kcalOver')}</div>
          </div>
        </Ring>
        <div className="stack grow" style={{ gap: 8 }}>
          <div className="row between small">
            <span className="muted">{t('nutrition.eaten')}</span>
            <strong className="num">{fmt(Math.round(tot.kcal))} kcal</strong>
          </div>
          <div className="row between small">
            <span className="muted">{t('nutrition.goal')}</span>
            <strong className="num">{fmt(goal.kcal)} kcal</strong>
          </div>
          {burned > 0 && (
            <div className="row between small">
              <span className="muted">{t('nutrition.plusCardio')}</span>
              <strong className="num">{burned} kcal</strong>
            </div>
          )}
        </div>
      </div>

      <div className="card grid3">
        <MacroCol label={t('common.protein')} v={tot.protein} max={goal.protein} color="var(--protein)" />
        <MacroCol label={t('common.carbsShort')} v={tot.carbs} max={goal.carbs} color="var(--carbs)" />
        <MacroCol label={t('common.fat')} v={tot.fat} max={goal.fat} color="var(--fat)" />
      </div>

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m)
        const kcal = totals(items).kcal
        return (
          <section key={m} className="card stack" style={{ gap: 0 }}>
            <div className="row between">
              <div>
                <h3>{mealName(m)}</h3>
                <span className="small muted num">{Math.round(kcal)} kcal</span>
              </div>
              <button className="icon-btn" aria-label={t('nutrition.addTo', { meal: mealName(m) })} onClick={() => setAddMeal(m)}>
                <Icon name="plus" />
              </button>
            </div>
            {items.length > 0 && (
              <div className="list" style={{ marginTop: 8 }}>
                {items.map((e) => {
                  const mm = macrosOf(e)
                  return (
                    <button key={e.id} className="list-item" onClick={() => setEditEntry(e)}>
                      <span className="grow">
                        <span style={{ fontWeight: 600 }}>{e.name}</span>
                        <span className="small muted" style={{ display: 'block' }}>
                          {t('nutrition.entryMeta', { g: fmt(e.grams), p: Math.round(mm.protein), c: Math.round(mm.carbs), f: Math.round(mm.fat) })}
                        </span>
                      </span>
                      <span className="num" style={{ fontWeight: 650 }}>
                        {Math.round(mm.kcal)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <MealActions day={day} meal={m} items={items} onSaveRecipe={setRecipeItems} />
          </section>
        )
      })}

      <SupplementsCard day={day} />

      <div className="card stack">
        <div className="row between">
          <h3>{t('nutrition.smart')}</h3>
          {s.kcalAdjustment !== 0 && <span className="badge accent">{t('nutrition.smartActive', { delta: signed(s.kcalAdjustment) })}</span>}
        </div>
        <p className="small muted">{t(`nutrition.adjust.${adj.kind}`, { delta: signed(adj.delta) })}</p>
        {adj.rate != null && <p className="small num">{t('nutrition.trend', { rate: signed(adj.rate, 2), goal: signed(adj.goal, 2) })}</p>}
        {adj.delta !== 0 && (
          <button
            className="btn primary"
            onClick={() => {
              s.setKcalAdjustment(s.kcalAdjustment + adj.delta)
              toast(t('nutrition.adjusted'))
            }}
          >
            {t('nutrition.apply', { delta: signed(adj.delta) })}
          </button>
        )}
      </div>

      <AddFoodSheet key={addMeal ?? 'zu'} meal={addMeal} day={day} onClose={() => setAddMeal(null)} />
      <SaveRecipeSheet key={recipeItems ? 'offen' : 'zu'} items={recipeItems} onClose={() => setRecipeItems(null)} />
      <EditEntrySheet key={editEntry?.id ?? 'zu'} entry={editEntry} onClose={() => setEditEntry(null)} />
    </div>
  )
}

function MacroCol({ label, v, max, color }: { label: string; v: number; max: number; color: string }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="tiny" style={{ fontWeight: 700 }}>
        {label}
      </span>
      <span className="num" style={{ fontWeight: 750 }}>
        {Math.round(v)}
        <span className="muted small" style={{ fontWeight: 500 }}>
          /{max} g
        </span>
      </span>
      <Bar value={v} max={max} color={color} />
    </div>
  )
}

type Tab = 'suche' | 'text' | 'scan' | 'rezepte' | 'eigen'

function AddFoodSheet({ meal, day, onClose }: { meal: Meal | null; day: string; onClose: () => void }) {
  const s = useStore()
  const [tab, setTab] = useState<Tab>('suche')
  const [picked, setPicked] = useState<Food | null>(null)
  const [mealSel, setMealSel] = useState<Meal>(meal ?? defaultMeal())
  if (!meal) return null
  const add = (f: Food, grams: number) => {
    const name = foodName(f, getLang())
    s.addFood({ date: day, meal: mealSel, foodId: f.id, name: f.brand ? `${name} (${f.brand})` : name, grams, per100: f.per100 })
    if (f.id.startsWith('off-')) s.saveCustomFood(f)
    toast(tr('nutrition.logged', { name }))
  }
  return (
    <Sheet open onClose={onClose} title={tr('nutrition.addTitle')}>
      <div className="stack lg">
        <select className="input" value={mealSel} onChange={(e) => setMealSel(e.target.value as Meal)} aria-label={tr('nutrition.mealLabel')}>
          {MEALS.map((m) => (
            <option key={m} value={m}>
              {mealName(m)}
            </option>
          ))}
        </select>
        {picked ? (
          <AmountPicker
            food={picked}
            onCancel={() => setPicked(null)}
            onAdd={(g) => {
              add(picked, g)
              setPicked(null)
              onClose()
            }}
          />
        ) : (
          <>
            <Segmented
              value={tab}
              onChange={setTab}
              label={tr('nutrition.inputMode')}
              options={[
                { value: 'suche', label: tr('nutrition.tab.suche') },
                { value: 'text', label: tr('nutrition.tab.text') },
                { value: 'scan', label: tr('nutrition.tab.scan') },
                { value: 'rezepte', label: tr('nutrition.tab.rezepte') },
                { value: 'eigen', label: tr('nutrition.tab.eigen') },
              ]}
            />
            {tab === 'suche' && <SearchTab onPick={setPicked} />}
            {tab === 'text' && (
              <TextTab
                onAdd={(items) => {
                  items.forEach((it) => it.food && add(it.food, it.grams))
                  onClose()
                }}
              />
            )}
            {tab === 'scan' && <ScanTab onFound={setPicked} />}
            {tab === 'rezepte' && <RecipeTab day={day} meal={mealSel} onDone={onClose} />}
            {tab === 'eigen' && (
              <CustomFoodForm
                onSave={(f) => {
                  s.saveCustomFood(f)
                  setPicked(f)
                }}
              />
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}

function SearchTab({ onPick }: { onPick: (f: Food) => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [online, setOnline] = useState<Food[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const foods = useMemo(() => allFoods(s), [s])
  const recents = recentFoods(s.foods)
  const lang = getLang()
  const nq = normalize(q)
  // every language's name and aliases are searchable; the user's cuisine comes first
  const local =
    nq.length >= 2
      ? foods
          .filter((f) => [...(f.names ? Object.values(f.names) : [f.name]), ...(f.aliases ?? []), f.brand ?? ''].some((n) => normalize(n).includes(nq)))
          .sort((a, b) => Number(b.region === lang) - Number(a.region === lang))
          .slice(0, 30)
      : []
  const abort = useRef<AbortController | null>(null)
  const goOnline = async () => {
    abort.current?.abort()
    abort.current = new AbortController()
    setLoading(true)
    setError('')
    try {
      setOnline(await searchOff(q.trim(), abort.current.signal, lang))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(tr('nutrition.offline'))
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="stack">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim()) goOnline()
        }}
      >
        <input className="input" value={q} onChange={(e) => (setQ(e.target.value), setOnline(null))} placeholder={tr('nutrition.searchPlaceholder')} aria-label={tr('nutrition.searchLabel')} autoFocus />
      </form>
      {q.trim().length < 2 && recents.length > 0 && (
        <>
          <span className="label">{tr('nutrition.recent')}</span>
          <div className="card list" style={{ padding: '0 16px' }}>
            {recents.map((r) => (
              <FoodRow key={r.id} food={{ id: r.foodId ?? r.id, name: r.name, per100: r.per100, portion: r.grams, portionLabel: tr('nutrition.lastAmount') }} onPick={onPick} />
            ))}
          </div>
        </>
      )}
      {local.length > 0 && (
        <div className="card list" style={{ padding: '0 16px' }}>
          {local.map((f) => (
            <FoodRow key={f.id} food={f} onPick={onPick} />
          ))}
        </div>
      )}
      {q.trim().length >= 2 && (
        <button className="btn block" onClick={goOnline} disabled={loading}>
          <Icon name="search" size={18} /> {loading ? tr('nutrition.searching') : tr('nutrition.searchOff')}
        </button>
      )}
      {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      {online && (
        <div className="card list" style={{ padding: '0 16px' }}>
          {online.length === 0 && <p className="empty">{tr('nutrition.nothing')}</p>}
          {online.map((f) => (
            <FoodRow key={f.id} food={f} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  )
}

function FoodRow({ food, onPick }: { food: Food; onPick: (f: Food) => void }) {
  return (
    <button className="list-item" onClick={() => onPick(food)}>
      <span className="grow">
        <span style={{ fontWeight: 600 }}>{foodName(food, getLang())}</span>
        <span className="small muted" style={{ display: 'block' }}>
          {food.brand ? `${food.brand} · ` : ''}
          {tr('nutrition.per100', { kcal: Math.round(food.per100.kcal), p: fmt(food.per100.protein, 1) })}
        </span>
      </span>
      <Icon name="plus" size={18} />
    </button>
  )
}

function AmountPicker({ food, onAdd, onCancel }: { food: Food; onAdd: (grams: number) => void; onCancel: () => void }) {
  const lang = getLang()
  const portion = foodPortion(food, lang)
  const [grams, setGrams] = useState(portion.grams ?? 100)
  const m = macrosOf({ grams, per100: food.per100 })
  return (
    <div className="stack lg">
      <div>
        <h3>{foodName(food, lang)}</h3>
        {food.brand && <p className="small muted">{food.brand}</p>}
      </div>
      <div className="row wrap">
        {portion.grams && (
          <button className="chip" onClick={() => setGrams(portion.grams!)}>
            {portion.label ?? tr('nutrition.portion')} ({fmt(portion.grams)} g)
          </button>
        )}
        {[50, 100, 150, 200, 250].map((g) => (
          <button key={g} className="chip" aria-pressed={grams === g} onClick={() => setGrams(g)}>
            {g} g
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="grams">{tr('nutrition.grams')}</label>
        <input id="grams" className="input" inputMode="decimal" value={grams || ''} onChange={(e) => setGrams(parseFloat(e.target.value.replace(',', '.')) || 0)} />
      </div>
      <div className="card grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat v={Math.round(m.kcal)} l="kcal" />
        <MiniStat v={fmt(m.protein, 1)} l={tr('common.protein')} />
        <MiniStat v={fmt(m.carbs, 1)} l={tr('common.carbsShort')} />
        <MiniStat v={fmt(m.fat, 1)} l={tr('common.fat')} />
      </div>
      <div className="row">
        <button className="btn grow" onClick={onCancel}>
          {tr('common.back')}
        </button>
        <button className="btn primary grow" disabled={!grams} onClick={() => onAdd(grams)}>
          {tr('nutrition.log')}
        </button>
      </div>
    </div>
  )
}

function MiniStat({ v, l }: { v: string | number; l: string }) {
  return (
    <div className="stat" style={{ alignItems: 'center' }}>
      <span className="num" style={{ fontWeight: 750 }}>
        {v}
      </span>
      <span className="tiny muted">{l}</span>
    </div>
  )
}

function TextTab({ onAdd }: { onAdd: (items: ParsedItem[]) => void }) {
  const s = useStore()
  const foods = useMemo(() => allFoods(s), [s])
  const [text, setText] = useState('')
  const lang = getLang()
  const items = useMemo(() => parseMealText(text, foods, lang), [text, foods, lang])
  const found = items.filter((i) => i.food)
  return (
    <div className="stack">
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('nutrition.textPlaceholder')} aria-label={tr('nutrition.textLabel')} />
      {items.length > 0 && (
        <div className="card list" style={{ padding: '0 16px' }}>
          {items.map((it, i) => (
            <div key={i} className="list-item">
              <span className="grow">
                <span style={{ fontWeight: 600 }}>{it.food ? foodName(it.food, lang) : it.text}</span>
                <span className="small muted" style={{ display: 'block' }}>
                  {it.food ? `${fmt(it.grams)} g · ${Math.round(macrosOf({ grams: it.grams, per100: it.food.per100 }).kcal)} kcal` : tr('nutrition.notRecognized')}
                </span>
              </span>
              {it.food ? <span className="badge ok">ok</span> : <span className="badge warn">?</span>}
            </div>
          ))}
        </div>
      )}
      <button className="btn primary block" disabled={!found.length} onClick={() => onAdd(found)}>
        {found.length ? tr('nutrition.logN', { n: found.length }) : tr('nutrition.log')}
      </button>
    </div>
  )
}

function ScanTab({ onFound }: { onFound: (f: Food) => void }) {
  const s = useStore()
  const video = useRef<HTMLVideoElement>(null)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')
  const [scanning, setScanning] = useState(false)

  const lookup = async (c: string) => {
    const local = s.customFoods.find((f) => f.barcode === c)
    if (local) return onFound(local)
    setStatus(tr('nutrition.scanSearching'))
    try {
      const f = await lookupBarcode(c, getLang())
      if (f) onFound(f)
      else setStatus(tr('nutrition.scanNotFound', { code: c }))
    } catch {
      setStatus(tr('nutrition.scanNoConnection'))
    }
  }
  // the camera loop only depends on `scanning`; this always sees the latest lookup
  const onScanned = useEffectEvent((c: string) => {
    lookup(c)
  })

  useEffect(() => {
    if (!scanning) return
    let stream: MediaStream | undefined
    let stop = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const native = (window as unknown as { BarcodeDetector?: typeof Ponyfill }).BarcodeDetector
        const Detector = native ?? (await import('barcode-detector/ponyfill')).BarcodeDetector
        const det = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        setStatus(tr('nutrition.scanHold'))
        while (!stop && video.current) {
          const found = await det.detect(video.current).catch(() => [])
          if (found.length) {
            const c = found[0].rawValue
            setScanning(false)
            setCode(c)
            if ('vibrate' in navigator) navigator.vibrate(80)
            onScanned(c)
            break
          }
          await new Promise((r) => setTimeout(r, 250))
        }
      } catch {
        setStatus(tr('nutrition.scanNoCamera'))
        setScanning(false)
      }
    })()
    return () => {
      stop = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [scanning])

  return (
    <div className="stack">
      {scanning ? (
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
          <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: '30% 10%', border: '3px solid var(--accent)', borderRadius: 12 }} />
        </div>
      ) : (
        <button className="btn primary block" onClick={() => setScanning(true)}>
          <Icon name="scan" size={18} /> {tr('nutrition.scanStart')}
        </button>
      )}
      {scanning && (
        <button className="btn block" onClick={() => setScanning(false)}>
          {tr('common.cancel')}
        </button>
      )}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim()) lookup(code.trim())
        }}
      >
        <input className="input" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder={tr('nutrition.eanPlaceholder')} aria-label="Barcode" />
        <button className="btn" type="submit">
          {tr('nutrition.search')}
        </button>
      </form>
      {status && <p className="small muted">{status}</p>}
    </div>
  )
}

function CustomFoodForm({ onSave }: { onSave: (f: Food) => void }) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')
  const [portion, setPortion] = useState('')
  const n = (v: string) => parseFloat(v.replace(',', '.')) || 0
  return (
    <div className="stack">
      <p className="small muted">{tr('nutrition.customHint')}</p>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('nutrition.customName')} aria-label={tr('nutrition.recipe.name')} />
      <div className="grid2">
        <input className="input" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" aria-label={tr('nutrition.customKcal')} />
        <input className="input" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder={tr('nutrition.customProtein')} aria-label={tr('nutrition.customProteinLabel')} />
        <input className="input" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} placeholder={tr('nutrition.customCarbs')} aria-label={tr('nutrition.customCarbsLabel')} />
        <input className="input" inputMode="decimal" value={f} onChange={(e) => setF(e.target.value)} placeholder={tr('nutrition.customFat')} aria-label={tr('nutrition.customFatLabel')} />
      </div>
      <input className="input" inputMode="decimal" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder={tr('nutrition.customPortion')} aria-label={tr('nutrition.customPortionLabel')} />
      <button
        className="btn primary block"
        disabled={!name.trim() || !n(kcal)}
        onClick={() =>
          onSave({
            id: `eigen-${uid()}`,
            name: name.trim(),
            per100: { kcal: n(kcal), protein: n(p), carbs: n(c), fat: n(f) },
            portion: n(portion) || undefined,
            portionLabel: n(portion) ? tr('nutrition.onePortion') : undefined,
            custom: true,
          })
        }
      >
        {tr('nutrition.saveAndLog')}
      </button>
    </div>
  )
}

function EditEntrySheet({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const s = useStore()
  const [grams, setGrams] = useState(entry?.grams ?? 100)
  if (!entry) return null
  const m = macrosOf({ grams, per100: entry.per100 })
  return (
    <Sheet open onClose={onClose} title={entry.name}>
      <div className="stack lg">
        <div className="field">
          <label htmlFor="edit-grams">{tr('nutrition.grams')}</label>
          <input id="edit-grams" className="input" inputMode="decimal" value={grams || ''} onChange={(e) => setGrams(parseFloat(e.target.value.replace(',', '.')) || 0)} />
        </div>
        <p className="small muted num">
          {Math.round(m.kcal)} kcal · {fmt(m.protein, 1)} g Protein · {fmt(m.carbs, 1)} g Kohlenhydrate · {fmt(m.fat, 1)} g Fett
        </p>
        <div className="row">
          <button
            className="btn danger grow"
            onClick={() => {
              s.removeFood(entry.id)
              onClose()
            }}
          >
            <Icon name="trash" size={18} /> {tr('common.delete')}
          </button>
          <button
            className="btn primary grow"
            onClick={() => {
              s.updateFood(entry.id, { grams })
              onClose()
            }}
          >
            {tr('common.save')}
          </button>
        </div>
        <button
          className="btn ghost block"
          onClick={() => {
            s.addFood({ ...entry, date: today(), grams })
            toast(tr('nutrition.loggedAgain'))
            onClose()
          }}
        >
          {tr('nutrition.eatAgain')}
        </button>
      </div>
    </Sheet>
  )
}

