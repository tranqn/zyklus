import { useEffect, useMemo, useRef, useState } from 'react'
import { macrosOf, parseMealText, suggestAdjustment, targets, totals, burnedToday, type ParsedItem } from '../domain/nutrition'
import type { BarcodeDetector as Ponyfill } from 'barcode-detector/ponyfill'
import { lookupBarcode, searchOff } from '../domain/openfoodfacts'
import type { Food, FoodEntry, Meal } from '../domain/types'
import { addDays, fmt, formatDate, today, uid } from '../domain/util'
import { allFoods, recentFoods, useStore } from '../store'
import { Bar, Icon, Ring, Segmented, Sheet, toast } from '../ui/kit'

const MEALS: { v: Meal; t: string }[] = [
  { v: 'fruehstueck', t: 'Frühstück' },
  { v: 'mittag', t: 'Mittagessen' },
  { v: 'abend', t: 'Abendessen' },
  { v: 'snack', t: 'Snacks' },
]

function defaultMeal(): Meal {
  const h = new Date().getHours()
  return h < 11 ? 'fruehstueck' : h < 16 ? 'mittag' : h < 21 ? 'abend' : 'snack'
}

export default function Nutrition() {
  const s = useStore()
  const [day, setDay] = useState(today())
  const [addMeal, setAddMeal] = useState<Meal | null>(null)
  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null)
  const profile = s.profile!
  const t = targets(profile, s.settings.kcalOverride, s.kcalAdjustment)
  const entries = s.foods.filter((f) => f.date === day)
  const tot = totals(entries)
  const burned = burnedToday(s.cardio, day)
  const budget = t.kcal + burned
  const adj = suggestAdjustment(profile, s.weights)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Ernährung</div>
          <h1>{day === today() ? 'Heute' : formatDate(day, { weekday: 'long', day: 'numeric', month: 'short' })}</h1>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn" aria-label="Vorheriger Tag" onClick={() => setDay(addDays(day, -1))}>
            <Icon name="back" size={20} />
          </button>
          <button className="icon-btn" aria-label="Nächster Tag" onClick={() => setDay(addDays(day, 1))} disabled={day >= today()}>
            <Icon name="chevron" size={20} />
          </button>
        </div>
      </div>

      <div className="card row" style={{ gap: 16 }}>
        <Ring value={tot.kcal} max={budget} size={116} stroke={11}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem' }} className="num">
              {Math.round(budget - tot.kcal).toLocaleString('de-DE')}
            </div>
            <div className="tiny muted">{budget - tot.kcal >= 0 ? 'kcal übrig' : 'kcal drüber'}</div>
          </div>
        </Ring>
        <div className="stack grow" style={{ gap: 8 }}>
          <div className="row between small">
            <span className="muted">Gegessen</span>
            <strong className="num">{Math.round(tot.kcal).toLocaleString('de-DE')} kcal</strong>
          </div>
          <div className="row between small">
            <span className="muted">Ziel</span>
            <strong className="num">{t.kcal.toLocaleString('de-DE')} kcal</strong>
          </div>
          {burned > 0 && (
            <div className="row between small">
              <span className="muted">+ Cardio</span>
              <strong className="num">{burned} kcal</strong>
            </div>
          )}
        </div>
      </div>

      <div className="card grid3">
        <MacroCol label="Protein" v={tot.protein} max={t.protein} color="var(--protein)" />
        <MacroCol label="Kohlenh." v={tot.carbs} max={t.carbs} color="var(--carbs)" />
        <MacroCol label="Fett" v={tot.fat} max={t.fat} color="var(--fat)" />
      </div>

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.v)
        const kcal = totals(items).kcal
        return (
          <section key={m.v} className="card stack" style={{ gap: 0 }}>
            <div className="row between">
              <div>
                <h3>{m.t}</h3>
                <span className="small muted num">{Math.round(kcal)} kcal</span>
              </div>
              <button className="icon-btn" aria-label={`Zu ${m.t} hinzufügen`} onClick={() => setAddMeal(m.v)}>
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
                          {fmt(e.grams)} g · {Math.round(mm.protein)} g P · {Math.round(mm.carbs)} g K · {Math.round(mm.fat)} g F
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
          </section>
        )
      })}

      <div className="card stack">
        <div className="row between">
          <h3>Smarte Kalorienanpassung</h3>
          {s.kcalAdjustment !== 0 && <span className="badge accent">{s.kcalAdjustment > 0 ? '+' : ''}{s.kcalAdjustment} kcal aktiv</span>}
        </div>
        <p className="small muted">{adj.text}</p>
        {adj.rate != null && (
          <p className="small">
            Trend: <strong className="num">{adj.rate > 0 ? '+' : ''}{fmt(adj.rate, 2)} kg/Woche</strong> · Ziel: <strong className="num">{adj.goal > 0 ? '+' : ''}{fmt(adj.goal, 2)} kg/Woche</strong>
          </p>
        )}
        {adj.delta !== 0 && (
          <button
            className="btn primary"
            onClick={() => {
              s.setKcalAdjustment(s.kcalAdjustment + adj.delta)
              toast('Kalorienziel angepasst')
            }}
          >
            Vorschlag übernehmen ({adj.delta > 0 ? '+' : ''}{adj.delta} kcal)
          </button>
        )}
      </div>

      <AddFoodSheet meal={addMeal} day={day} onClose={() => setAddMeal(null)} />
      <EditEntrySheet entry={editEntry} onClose={() => setEditEntry(null)} />
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

type Tab = 'suche' | 'text' | 'scan' | 'eigen'

function AddFoodSheet({ meal, day, onClose }: { meal: Meal | null; day: string; onClose: () => void }) {
  const s = useStore()
  const [tab, setTab] = useState<Tab>('suche')
  const [picked, setPicked] = useState<Food | null>(null)
  const [mealSel, setMealSel] = useState<Meal>(meal ?? defaultMeal())
  useEffect(() => {
    if (meal) {
      setMealSel(meal)
      setPicked(null)
    }
  }, [meal])
  if (!meal) return null
  const add = (f: Food, grams: number) => {
    s.addFood({ date: day, meal: mealSel, foodId: f.id, name: f.brand ? `${f.name} (${f.brand})` : f.name, grams, per100: f.per100 })
    if (f.id.startsWith('off-')) s.saveCustomFood(f)
    toast(`${f.name} eingetragen`)
  }
  return (
    <Sheet open onClose={onClose} title="Lebensmittel eintragen">
      <div className="stack lg">
        <select className="input" value={mealSel} onChange={(e) => setMealSel(e.target.value as Meal)} aria-label="Mahlzeit">
          {MEALS.map((m) => (
            <option key={m.v} value={m.v}>
              {m.t}
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
              label="Eingabeart"
              options={[
                { value: 'suche', label: 'Suche' },
                { value: 'text', label: 'Freitext' },
                { value: 'scan', label: 'Barcode' },
                { value: 'eigen', label: 'Eigenes' },
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
  const local = q.trim().length >= 2 ? foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) || f.brand?.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : []
  const abort = useRef<AbortController | null>(null)
  const goOnline = async () => {
    abort.current?.abort()
    abort.current = new AbortController()
    setLoading(true)
    setError('')
    try {
      setOnline(await searchOff(q.trim(), abort.current.signal))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('Online-Suche gerade nicht erreichbar.')
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
        <input className="input" value={q} onChange={(e) => (setQ(e.target.value), setOnline(null))} placeholder="z. B. Skyr, Haferflocken, Döner" aria-label="Lebensmittel suchen" autoFocus />
      </form>
      {q.trim().length < 2 && recents.length > 0 && (
        <>
          <span className="label">Zuletzt gegessen</span>
          <div className="card list" style={{ padding: '0 16px' }}>
            {recents.map((r) => (
              <FoodRow key={r.id} food={{ id: r.foodId ?? r.id, name: r.name, per100: r.per100, portion: r.grams, portionLabel: 'letzte Menge' }} onPick={onPick} />
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
          <Icon name="search" size={18} /> {loading ? 'Suche läuft …' : 'In Open Food Facts suchen (3 Mio.+ Produkte)'}
        </button>
      )}
      {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      {online && (
        <div className="card list" style={{ padding: '0 16px' }}>
          {online.length === 0 && <p className="empty">Nichts gefunden.</p>}
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
        <span style={{ fontWeight: 600 }}>{food.name}</span>
        <span className="small muted" style={{ display: 'block' }}>
          {food.brand ? `${food.brand} · ` : ''}
          {Math.round(food.per100.kcal)} kcal · {fmt(food.per100.protein, 1)} g Protein / 100 g
        </span>
      </span>
      <Icon name="plus" size={18} />
    </button>
  )
}

function AmountPicker({ food, onAdd, onCancel }: { food: Food; onAdd: (grams: number) => void; onCancel: () => void }) {
  const [grams, setGrams] = useState(food.portion ?? 100)
  const m = macrosOf({ grams, per100: food.per100 })
  return (
    <div className="stack lg">
      <div>
        <h3>{food.name}</h3>
        {food.brand && <p className="small muted">{food.brand}</p>}
      </div>
      <div className="row wrap">
        {food.portion && (
          <button className="chip" onClick={() => setGrams(food.portion!)}>
            {food.portionLabel ?? 'Portion'} ({fmt(food.portion)} g)
          </button>
        )}
        {[50, 100, 150, 200, 250].map((g) => (
          <button key={g} className="chip" aria-pressed={grams === g} onClick={() => setGrams(g)}>
            {g} g
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="grams">Menge in Gramm</label>
        <input id="grams" className="input" inputMode="decimal" value={grams || ''} onChange={(e) => setGrams(parseFloat(e.target.value.replace(',', '.')) || 0)} />
      </div>
      <div className="card grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat v={Math.round(m.kcal)} l="kcal" />
        <MiniStat v={fmt(m.protein, 1)} l="Protein" />
        <MiniStat v={fmt(m.carbs, 1)} l="Kohlenh." />
        <MiniStat v={fmt(m.fat, 1)} l="Fett" />
      </div>
      <div className="row">
        <button className="btn grow" onClick={onCancel}>
          Zurück
        </button>
        <button className="btn primary grow" disabled={!grams} onClick={() => onAdd(grams)}>
          Eintragen
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
  const [items, setItems] = useState<ParsedItem[]>([])
  useEffect(() => {
    setItems(parseMealText(text, foods))
  }, [text, foods])
  const found = items.filter((i) => i.food)
  return (
    <div className="stack">
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Schreib einfach, was du gegessen hast: 150g Hähnchen, 200g Reis gekocht und 1 Banane" aria-label="Mahlzeit als Text" />
      {items.length > 0 && (
        <div className="card list" style={{ padding: '0 16px' }}>
          {items.map((it, i) => (
            <div key={i} className="list-item">
              <span className="grow">
                <span style={{ fontWeight: 600 }}>{it.food ? it.food.name : it.text}</span>
                <span className="small muted" style={{ display: 'block' }}>
                  {it.food ? `${fmt(it.grams)} g · ${Math.round(macrosOf({ grams: it.grams, per100: it.food.per100 }).kcal)} kcal` : 'Nicht erkannt, bitte über die Suche eintragen'}
                </span>
              </span>
              {it.food ? <span className="badge ok">ok</span> : <span className="badge warn">?</span>}
            </div>
          ))}
        </div>
      )}
      <button className="btn primary block" disabled={!found.length} onClick={() => onAdd(found)}>
        {found.length ? `${found.length} Lebensmittel eintragen` : 'Eintragen'}
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
    setStatus('Suche Produkt …')
    try {
      const f = await lookupBarcode(c)
      if (f) onFound(f)
      else setStatus(`Produkt ${c} nicht gefunden. Leg es unter „Eigenes" an.`)
    } catch {
      setStatus('Keine Verbindung zu Open Food Facts.')
    }
  }

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
        setStatus('Barcode in den Rahmen halten …')
        while (!stop && video.current) {
          const found = await det.detect(video.current).catch(() => [])
          if (found.length) {
            const c = found[0].rawValue
            setScanning(false)
            setCode(c)
            if ('vibrate' in navigator) navigator.vibrate(80)
            lookup(c)
            break
          }
          await new Promise((r) => setTimeout(r, 250))
        }
      } catch {
        setStatus('Kamera nicht verfügbar. Gib den Code manuell ein.')
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
          <Icon name="scan" size={18} /> Kamera starten
        </button>
      )}
      {scanning && (
        <button className="btn block" onClick={() => setScanning(false)}>
          Abbrechen
        </button>
      )}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim()) lookup(code.trim())
        }}
      >
        <input className="input" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="EAN manuell eingeben" aria-label="Barcode" />
        <button className="btn" type="submit">
          Suchen
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
      <p className="small muted">Werte pro 100 g, z. B. von der Verpackung oder einem eigenen Rezept.</p>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, z. B. Omas Linsensuppe" aria-label="Name" />
      <div className="grid2">
        <input className="input" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" aria-label="Kilokalorien pro 100 g" />
        <input className="input" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="Protein g" aria-label="Protein pro 100 g" />
        <input className="input" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} placeholder="Kohlenhydrate g" aria-label="Kohlenhydrate pro 100 g" />
        <input className="input" inputMode="decimal" value={f} onChange={(e) => setF(e.target.value)} placeholder="Fett g" aria-label="Fett pro 100 g" />
      </div>
      <input className="input" inputMode="decimal" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="Portionsgröße in g (optional)" aria-label="Portionsgröße" />
      <button
        className="btn primary block"
        disabled={!name.trim() || !n(kcal)}
        onClick={() =>
          onSave({
            id: `eigen-${uid()}`,
            name: name.trim(),
            per100: { kcal: n(kcal), protein: n(p), carbs: n(c), fat: n(f) },
            portion: n(portion) || undefined,
            portionLabel: n(portion) ? '1 Portion' : undefined,
            custom: true,
          })
        }
      >
        Speichern und eintragen
      </button>
    </div>
  )
}

function EditEntrySheet({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const s = useStore()
  const [grams, setGrams] = useState(entry?.grams ?? 100)
  useEffect(() => {
    if (entry) setGrams(entry.grams)
  }, [entry])
  if (!entry) return null
  const m = macrosOf({ grams, per100: entry.per100 })
  return (
    <Sheet open onClose={onClose} title={entry.name}>
      <div className="stack lg">
        <div className="field">
          <label htmlFor="edit-grams">Menge in Gramm</label>
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
            <Icon name="trash" size={18} /> Löschen
          </button>
          <button
            className="btn primary grow"
            onClick={() => {
              s.updateFood(entry.id, { grams })
              onClose()
            }}
          >
            Speichern
          </button>
        </div>
        <button
          className="btn ghost block"
          onClick={() => {
            s.addFood({ ...entry, date: today(), grams })
            toast('Für heute erneut eingetragen')
            onClose()
          }}
        >
          Heute nochmal essen
        </button>
      </div>
    </Sheet>
  )
}

