/**
 * The sync engine end to end against a fake API: every "device" is a fresh copy of the store and
 * engine modules with its own localStorage, all of them talk to one FakeServer. The browser
 * shares one cookie between tabs, and so do the devices here (the two-tab case is the point;
 * for two devices of the same account it makes no difference).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canon, type SyncDoc } from '../../sync/merge'

const ORIGIN = 'https://mci.example.test'
const T0 = Date.UTC(2026, 10, 2, 12)

class MemStorage {
  private m = new Map<string, string>()
  /** simulates a full localStorage for the stash */
  full = false
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => {
    if (this.full && k === 'zyklus-stash') throw new Error('QuotaExceededError')
    this.m.set(k, String(v))
  }
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
  key = (i: number) => [...this.m.keys()][i] ?? null
  get length() {
    return this.m.size
  }
}

interface Account {
  id: number
  email: string
  createdAt: number
}
interface Logged {
  method: string
  path: string
  account?: string
  status: number
  body?: { rev?: number; data?: SyncDoc }
}

/** Mirrors server/src/app.ts for the routes the engine uses (status codes and error codes). */
class FakeServer {
  accounts: Account[] = []
  docs = new Map<number, { rev: number; data: string }>()
  /** account behind the session cookie */
  session?: number
  online = true
  log: Logged[] = []

  add(email: string, createdAt = Date.UTC(2026, 0, 1)): Account {
    const a = { id: this.accounts.length + 1, email, createdAt }
    this.accounts.push(a)
    return a
  }
  doc(a: Account): { rev: number; data: SyncDoc } | undefined {
    const d = this.docs.get(a.id)
    return d && { rev: d.rev, data: JSON.parse(d.data) }
  }
  puts = () => this.log.filter((r) => r.method === 'PUT')
  private gates: { method: string; path: string; wait: Promise<void> }[] = []
  /** Hold back the answer to the next such request (computed when it arrives) until released. */
  gate(method: string, path: string): () => void {
    let release!: () => void
    this.gates.push({ method, path, wait: new Promise<void>((r) => (release = r)) })
    return release
  }

  fetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    if (!this.online) throw new TypeError('Failed to fetch')
    const method = init.method ?? 'GET'
    const path = input.replace(/^\/api/, '')
    const account = new Headers(init.headers).get('x-zyklus-account') ?? undefined
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    const [status, out] = this.handle(method, path, account, body)
    this.log.push({ method, path, account, status, body })
    const g = this.gates.findIndex((x) => x.method === method && x.path === path)
    if (g >= 0) await this.gates.splice(g, 1)[0].wait
    return new Response(JSON.stringify(out), { status, headers: { 'content-type': 'application/json' } })
  }

  private handle(method: string, path: string, account: string | undefined, body: Record<string, unknown> | undefined): [number, unknown] {
    const pub = (a: Account) => ({ id: a.id, email: a.email, verified: true, createdAt: a.createdAt, locale: 'de' })
    const user = this.accounts.find((a) => a.id === this.session)
    if (path === '/auth/me') return [200, { user: user ? pub(user) : null }]
    if (path === '/auth/login') {
      const a = this.accounts.find((x) => x.email === body?.email)
      if (!a) return [401, { error: 'credentials' }]
      this.session = a.id
      return [200, { user: pub(a) }]
    }
    if (path === '/auth/logout') {
      this.session = undefined
      return [200, { ok: true }]
    }
    if (!user) return [401, { error: 'unauthenticated' }]
    if (account !== undefined && account !== `${user.id}:${user.createdAt}`) return [409, { error: 'account_mismatch' }]
    if (path !== '/state') return [200, { ok: true }]
    const cur = this.docs.get(user.id)
    if (method === 'GET') return [200, cur ? { rev: cur.rev, data: JSON.parse(cur.data) } : { rev: 0, data: null }]
    const data = body?.data as SyncDoc | undefined
    const v = data?.v as number | undefined
    if (v !== 1 && v !== 2) return [400, { error: 'data' }]
    if (v === 2 && account === undefined) return [400, { error: 'account' }]
    if (v === 1 && cur && JSON.parse(cur.data).v === 2) return [426, { error: 'client_outdated' }]
    if (body?.rev !== (cur?.rev ?? 0)) {
      if (!cur) return [409, { error: 'conflict', rev: 0, data: null }]
      return [409, { error: 'conflict', rev: cur.rev, data: JSON.parse(cur.data) }]
    }
    const rev = (cur?.rev ?? 0) + 1
    this.docs.set(user.id, { rev, data: JSON.stringify(data) })
    return [200, { rev }]
  }
}

let server: FakeServer
const stops: (() => void)[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'], now: T0 })
  server = new FakeServer()
  vi.stubGlobal('fetch', server.fetch)
  vi.stubGlobal('location', { origin: ORIGIN })
  vi.stubGlobal('document', { visibilityState: 'hidden', addEventListener() {}, removeEventListener() {} })
  vi.stubGlobal('window', {
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    setInterval: (fn: () => void, ms: number) => globalThis.setInterval(fn, ms),
    clearInterval: (id: number) => globalThis.clearInterval(id),
    addEventListener() {},
    removeEventListener() {},
  })
})

afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** A device (or tab) with its own copy of store and engine; `storage` lets two tabs share localStorage. */
async function device(storage = new MemStorage()) {
  vi.resetModules()
  vi.stubGlobal('localStorage', storage)
  const { useStore } = await import('../../store')
  const engine = await import('../../sync/engine')
  stops.push(engine.startSync())
  const d = {
    storage,
    store: useStore,
    engine,
    get s() {
      return useStore.getState()
    },
    /** what this device would upload */
    doc(): SyncDoc {
      const st = useStore.getState() as unknown as Record<string, unknown>
      const state: Record<string, unknown> = {}
      for (const k of Object.keys(st)) if (typeof st[k] !== 'function' && k !== 'syncMeta' && k !== 'owner') state[k] = st[k]
      return { v: 1, state, stamps: useStore.getState().syncMeta.stamps, tombstones: useStore.getState().syncMeta.tombstones }
    },
    /** let pending uploads go out, then pull */
    async sync() {
      await vi.advanceTimersByTimeAsync(2000)
      await engine.syncNow()
    },
  }
  return d
}

const per100 = { kcal: 100, protein: 10, carbs: 10, fat: 1 }
const meal = (name: string, date = '2026-11-02') => ({ date, meal: 'mittag' as const, name, grams: 100, per100 })

describe('sync engine: convergence', () => {
  it('two devices that alternately pull and push converge, and the server revision stops increasing', async () => {
    server.add('a@example.test')
    const a = await device()
    await a.engine.login('a@example.test', 'pw')
    const b = await device()
    await b.engine.login('a@example.test', 'pw')

    a.s.addFood(meal('Apfel'))
    await a.sync()
    b.s.addFood(meal('Brot'))
    b.s.updateSettings({ warmupSets: false })
    await b.sync()
    a.s.addFood(meal('Reis'))
    a.s.setKcalAdjustment(150)
    await a.sync()
    b.s.addCardio({ date: '2026-11-02', activityId: 'gehen', minutes: 30, intensity: 1, kcal: 120 })
    await b.sync()

    for (let i = 0; i < 2; i++) {
      await a.sync()
      await b.sync()
    }
    const rev = server.doc(server.accounts[0])!.rev
    for (let i = 0; i < 4; i++) {
      await a.sync()
      await b.sync()
    }
    expect(server.doc(server.accounts[0])!.rev).toBe(rev)
    expect(a.s.foods.map((f) => f.name)).toEqual(b.s.foods.map((f) => f.name))
    expect(a.s.foods).toHaveLength(3)
    expect(canon(a.doc().state)).toBe(canon(b.doc().state))
  })

  it('does not upload when the server copy differs only in key order', async () => {
    server.add('a@example.test')
    const a = await device()
    await a.engine.login('a@example.test', 'pw')
    a.s.addFood(meal('Apfel'))
    a.s.updateSettings({ warmupSets: false })
    await a.sync()
    const acc = server.accounts[0]
    const stored = server.doc(acc)!
    // the same document with every object's keys reversed, as another client might write it
    const reverse = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(reverse) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reverse(x)])) : v
    server.docs.set(acc.id, { rev: stored.rev, data: JSON.stringify(reverse(stored.data)) })
    const before = server.puts().length
    await a.sync()
    await a.sync()
    expect(server.puts().length).toBe(before)
  })
})

describe('sync engine: first sync of a device', () => {
  it('keeps the unstamped values of the account, while stamped local edits made before signing in still win', async () => {
    const acc = server.add('a@example.test')
    const DAY = 86_400_000
    // written by a device from before stamps existed: profile and settings were never stamped
    const settings = { restTimerSound: false, restTimerVibrate: true, warmupSets: true, excludedExercises: [], mode: 'normal' }
    const profile = { name: 'Konto', daysPerWeek: 3, weightKg: 80 }
    server.docs.set(acc.id, {
      rev: 3,
      data: JSON.stringify({ v: 1, state: { version: 1, profile, settings, kcalAdjustment: 50, foods: [{ id: 'x', ...meal('Alt') }] }, stamps: { 's:kcalAdjustment': T0 - DAY }, tombstones: {} }),
    })
    const fresh = await device()
    // used before signing in: this edit is stamped and newer than the account's
    fresh.s.setKcalAdjustment(200)
    await fresh.engine.login('a@example.test', 'pw')
    await fresh.sync()
    expect(fresh.s.settings).toEqual(settings)
    expect(fresh.s.profile).toEqual(profile)
    expect(fresh.s.kcalAdjustment).toBe(200)
    expect(fresh.s.foods.map((f) => f.id)).toEqual(['x'])
    const up = server.doc(acc)!.data.state
    expect(up.settings).toEqual(settings)
    expect(up.kcalAdjustment).toBe(200)
  })
})

const names = (foods: { name: string }[] | undefined) => (foods ?? []).map((f) => f.name)
const docWith = (...foods: string[]) =>
  JSON.stringify({ v: 1, state: { foods: foods.map((name, i) => ({ id: `${name}-${i}`, ...meal(name) })) }, stamps: Object.fromEntries(foods.map((name, i) => [`i:foods:${name}-${i}`, T0 - 1000])), tombstones: {} })
const stashOf = (storage: MemStorage) => JSON.parse(storage.getItem('zyklus-stash') ?? 'null') as { savedAt: number; owner?: unknown; doc: SyncDoc } | null
/** let a session check that api() started in the background run to its end */
const settle = () => vi.advanceTimersByTimeAsync(10)

describe('sync engine: account binding', () => {
  it('names the bound account on every request', async () => {
    const a = server.add('a@example.test')
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    d.s.addFood(meal('Apfel'))
    await d.sync()
    const after = server.log.slice(server.log.findIndex((r) => r.path === '/auth/login') + 1)
    expect(after.length).toBeGreaterThan(1)
    for (const r of after) expect(r.account, `${r.method} ${r.path}`).toBe(`${a.id}:${a.createdAt}`)
    expect(d.s.owner).toEqual({ origin: ORIGIN, id: a.id, createdAt: a.createdAt })
  })

  it('the same account signing in again keeps the local data, including edits made while signed out', async () => {
    server.add('a@example.test')
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    d.s.addFood(meal('Apfel'))
    await d.sync()
    await d.engine.logout(false)
    expect(d.s.owner).toBeDefined()
    d.s.addFood(meal('Offline'))
    await d.engine.login('a@example.test', 'pw')
    await d.sync()
    expect(names(d.s.foods)).toEqual(['Apfel', 'Offline'])
    expect(names(server.doc(server.accounts[0])!.data.state.foods as never)).toEqual(['Apfel', 'Offline'])
    expect(d.storage.getItem('zyklus-stash')).toBeNull()
  })

  it('signing in as another account stashes the local data and starts clean', async () => {
    const x = server.add('x@example.test')
    const y = server.add('y@example.test')
    server.docs.set(y.id, { rev: 1, data: docWith('Y-Essen') })
    const d = await device()
    await d.engine.login('x@example.test', 'pw')
    d.s.addFood(meal('X-Essen'))
    await d.sync()
    await d.engine.logout(false)
    await d.engine.login('y@example.test', 'pw')
    await d.sync()
    expect(names(d.s.foods)).toEqual(['Y-Essen'])
    expect(names(server.doc(y)!.data.state.foods as never)).toEqual(['Y-Essen'])
    const stash = stashOf(d.storage)!
    expect(stash.owner).toEqual({ origin: ORIGIN, id: x.id, createdAt: x.createdAt })
    expect(names(stash.doc.state.foods as never)).toEqual(['X-Essen'])
  })

  it('a re-created account that got the same id counts as another account', async () => {
    const x = server.add('x@example.test')
    const d = await device()
    await d.engine.login('x@example.test', 'pw')
    d.s.addFood(meal('Alt'))
    await d.sync()
    await d.engine.logout(false)
    // deleted elsewhere; SQLite hands the id to the next sign-up
    server.accounts = [{ id: x.id, email: 'neu@example.test', createdAt: x.createdAt + 86_400_000 }]
    server.docs.clear()
    await d.engine.login('neu@example.test', 'pw')
    await d.sync()
    expect(d.s.foods).toEqual([])
    expect(names(server.doc(server.accounts[0])?.data.state.foods as never)).toEqual([])
    expect(names(stashOf(d.storage)!.doc.state.foods as never)).toEqual(['Alt'])
  })

  it('refuses to switch accounts when the local data cannot be stashed, and loses nothing', async () => {
    const x = server.add('x@example.test')
    const y = server.add('y@example.test')
    server.docs.set(y.id, { rev: 1, data: docWith('Y-Essen') })
    const d = await device()
    await d.engine.login('x@example.test', 'pw')
    d.s.addFood(meal('X-Essen'))
    await d.sync()
    await d.engine.logout(false)
    d.storage.full = true
    await expect(d.engine.login('y@example.test', 'pw')).rejects.toThrow()
    await d.sync()
    expect(names(d.s.foods)).toEqual(['X-Essen'])
    expect(d.s.owner).toEqual({ origin: ORIGIN, id: x.id, createdAt: x.createdAt })
    expect(d.engine.useSync.getState().user).toBeUndefined()
    expect(server.doc(y)!.rev).toBe(1)
  })

  it('two tabs: after the other tab signed in as Y, this tab stashes X, switches to Y and leaks nothing', async () => {
    const x = server.add('x@example.test')
    const y = server.add('y@example.test')
    server.docs.set(y.id, { rev: 1, data: docWith('Y-Essen') })
    const storage = new MemStorage()
    const tab1 = await device(storage)
    await tab1.engine.login('x@example.test', 'pw')
    tab1.s.addFood(meal('X-Essen'))
    await tab1.sync()
    // a second tab of the same browser: same localStorage, same cookie
    const tab2 = await device(storage)
    await tab2.engine.logout(false)
    await tab2.engine.login('y@example.test', 'pw')
    // tab 1 still holds X's data in memory
    tab1.s.addFood(meal('X-Neu'))
    await tab1.sync()
    await settle()
    await tab1.sync()
    // tab 1's upload as X was refused once the session was Y's
    const switchedAt = server.log.findLastIndex((r) => r.path === '/auth/login')
    const asX = server.log.slice(switchedAt + 1).filter((r) => r.path === '/state' && r.account === `${x.id}:${x.createdAt}`)
    expect(asX.map((r) => r.status)).toEqual([409])
    expect(names(server.doc(y)!.data.state.foods as never)).toEqual(['Y-Essen'])
    // X keeps what it had; X-Neu never reached it and waits in the stash
    expect(names(server.doc(x)!.data.state.foods as never)).toEqual(['X-Essen'])
    expect(names(tab1.s.foods)).toEqual(['Y-Essen'])
    expect(tab1.s.owner).toEqual({ origin: ORIGIN, id: y.id, createdAt: y.createdAt })
    const stash = stashOf(storage)!
    expect(stash.owner).toEqual({ origin: ORIGIN, id: x.id, createdAt: x.createdAt })
    expect(names(stash.doc.state.foods as never)).toEqual(['X-Essen', 'X-Neu'])
  })

  it('drops a pull that answers after the account was forgotten', async () => {
    server.add('a@example.test')
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    d.s.addFood(meal('Apfel'))
    await d.sync()
    const release = server.gate('GET', '/state')
    const pending = d.engine.syncNow()
    await settle()
    d.engine.forgetAccount()
    release()
    await pending
    await d.sync()
    expect(d.s.foods).toEqual([])
    expect(d.engine.useSync.getState().rev).toBe(0)
  })

  it('drops a pull for X that answers after the device switched to Y', async () => {
    server.add('x@example.test')
    const y = server.add('y@example.test')
    server.docs.set(y.id, { rev: 1, data: docWith('Y-Essen') })
    const d = await device()
    await d.engine.login('x@example.test', 'pw')
    d.s.addFood(meal('X-Essen'))
    await d.sync()
    const release = server.gate('GET', '/state')
    const pending = d.engine.syncNow()
    await settle()
    // another tab signs in as Y while X's data is on its way back
    server.session = y.id
    const switched = d.engine.checkSession()
    await settle()
    release()
    await pending
    await switched
    await d.sync()
    expect(names(d.s.foods)).toEqual(['Y-Essen'])
    expect(names(server.doc(y)!.data.state.foods as never)).toEqual(['Y-Essen'])
  })
})

describe('sync engine: legacy binding (ownerId only, written by older bundles)', () => {
  const DAY = 86_400_000
  const pub = (a: { id: number; createdAt: number }) => ({ id: a.id, email: 'x@example.test', verified: true, createdAt: a.createdAt, locale: 'de' })
  function legacyDevice(x: Account, sync: { user?: ReturnType<typeof pub>; lastSyncedAt?: number }) {
    const storage = new MemStorage()
    storage.setItem('zyklus-sync', JSON.stringify({ state: { ownerId: x.id, rev: 1, ...sync }, version: 0 }))
    const food = { id: 'l1', ...meal('Lokal') }
    storage.setItem('zyklus-v1', JSON.stringify({ state: { foods: [food], syncMeta: { stamps: { 'i:foods:l1': x.createdAt + DAY }, tombstones: {} } }, version: 1 }))
    return storage
  }
  async function signIn(storage: MemStorage, x: Account) {
    server.docs.set(x.id, { rev: 1, data: docWith('Konto') })
    server.session = x.id
    const d = await device(storage)
    await d.engine.checkSession()
    await d.sync()
    return d
  }

  it('upgrades the binding silently when the cached user is the same account (id and createdAt)', async () => {
    const x = server.add('x@example.test')
    // no lastSyncedAt: the device clock is not consulted
    const d = await signIn(legacyDevice(x, { user: pub(x) }), x)
    expect(names(d.s.foods).sort()).toEqual(['Konto', 'Lokal'])
    expect(d.s.owner).toEqual({ origin: ORIGIN, id: x.id, createdAt: x.createdAt })
    expect(d.storage.getItem('zyklus-stash')).toBeNull()
  })

  it('stashes and starts clean when the cached user is a deleted account with the same id, whatever the clock says', async () => {
    const x = server.add('x@example.test')
    const d = await signIn(legacyDevice(x, { user: pub({ id: x.id, createdAt: x.createdAt - DAY }), lastSyncedAt: x.createdAt + DAY }), x)
    expect(names(d.s.foods)).toEqual(['Konto'])
    expect(names(stashOf(d.storage)!.doc.state.foods as never)).toEqual(['Lokal'])
    expect(names(server.doc(x)!.data.state.foods as never)).toEqual(['Konto'])
  })

  it('stashes and starts clean without a cached user (an old logout that kept the data)', async () => {
    const x = server.add('x@example.test')
    const d = await signIn(legacyDevice(x, { lastSyncedAt: x.createdAt + DAY }), x)
    expect(names(d.s.foods)).toEqual(['Konto'])
    expect(names(stashOf(d.storage)!.doc.state.foods as never)).toEqual(['Lokal'])
    expect(names(server.doc(x)!.data.state.foods as never)).toEqual(['Konto'])
  })
})

describe('sync engine: document version', () => {
  it('uploads version 2 documents, always with the account header', async () => {
    const a = server.add('a@example.test')
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    d.s.addFood(meal('Apfel'))
    await d.sync()
    expect(server.puts().length).toBeGreaterThan(0)
    for (const p of server.puts()) {
      expect(p.body?.data?.v).toBe(2)
      expect(p.account).toBe(`${a.id}:${a.createdAt}`)
    }
    expect(server.doc(a)!.data.v).toBe(2)
  })

  it('lifts a version 1 document of the account to version 2 and tells an outdated client to reload', async () => {
    const a = server.add('a@example.test')
    server.docs.set(a.id, { rev: 4, data: docWith('Alt') })
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    await d.sync()
    expect(server.doc(a)).toMatchObject({ rev: 5, data: { v: 2 } })
    const { ApiError, apiMessage } = await import('../../sync/api')
    const { translate } = await import('../../i18n')
    const msg = apiMessage(new ApiError(426, 'client_outdated', ''))
    expect(msg).not.toBe(apiMessage(new ApiError(400, 'unknown_code', '')))
    expect(msg).toMatch(/reload|neu/)
    expect(translate('de', 'account.apiError.client_outdated')).toMatch(/Bitte lade die App neu/)
  })
})

describe('sync engine: a planned meal is booked as a unit', () => {
  it('two devices book different dishes for the same slot offline: the diary holds exactly the winning booking', async () => {
    server.add('a@example.test')
    const a = await device()
    await a.engine.login('a@example.test', 'pw')
    const b = await device()
    await b.engine.login('a@example.test', 'pw')
    const date = '2026-11-02'
    const slot = { id: `${date}|mittag|0`, date, meal: 'mittag' as const, dishId: 'porridge', factor: 1 }
    a.s.setMealPlan([date], [slot])
    await a.sync()
    await b.sync()
    expect(b.s.mealPlan.map((p) => p.id)).toEqual([slot.id])

    const items = (list: [string, number, number][]) => list.map(([name, grams, kcal]) => ({ date, meal: 'mittag' as const, name, grams, per100: { kcal, protein: 1, carbs: 1, fat: 1 } }))
    server.online = false
    a.s.logPlannedMeal(slot.id, items([['Hafer', 60, 370], ['Milch', 250, 64], ['Beeren', 80, 40]]))
    await vi.advanceTimersByTimeAsync(1000)
    // the other device swapped the dish first, then booked it a moment later
    b.s.updatePlannedMeal(slot.id, { dishId: 'reis-huhn' })
    b.s.logPlannedMeal(slot.id, items([['Reis', 150, 130], ['Huhn', 120, 110]]))
    await a.sync()
    await b.sync()
    server.online = true
    await a.sync()
    await b.sync()
    await a.sync()

    for (const d of [a, b]) {
      const diary = d.s.foods.filter((f) => f.date === date)
      expect(names(diary)).toEqual(['Reis', 'Huhn'])
      expect(diary.reduce((sum, f) => sum + (f.grams * f.per100.kcal) / 100, 0)).toBe(195 + 132)
      expect(d.s.mealPlan[0]).toMatchObject({ dishId: 'reis-huhn', logged: true })
    }
    const stored = server.doc(server.accounts[0])!.data.state.foods as { name: string }[]
    expect(names(stored)).toEqual(['Reis', 'Huhn'])
  })
})

describe('sync engine: restoring a backup', () => {
  /** the backup file, as SettingsPage exportData writes it */
  const backupOf = async (d: Awaited<ReturnType<typeof device>>) => JSON.stringify((await import('../../store')).backupOf(d.store.getState()))

  it('an invalid file shows an error and writes nothing, so nothing is uploaded', async () => {
    server.add('a@example.test')
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    d.s.addFood(meal('Apfel'))
    await d.sync()
    const { restoreBackup } = await import('../../sync/restore')
    const { onToast } = await import('../../ui/notify')
    const { t } = await import('../../i18n')
    const toasts: string[] = []
    const off = onToast((m) => toasts.push(m))
    const before = canon(d.doc())
    const puts = server.puts().length
    expect(restoreBackup('{"sessions": []}')).toBe(false)
    expect(restoreBackup('kein json')).toBe(false)
    off()
    await d.sync()
    expect(toasts).toEqual([t('more.settings.badBackup'), t('more.settings.badBackup')])
    expect(canon(d.doc())).toBe(before)
    expect(server.puts().length).toBe(puts)
  })

  it('delete, restore an older backup, an old offline device syncs: nothing deleted after the backup comes back', async () => {
    server.add('a@example.test')
    const old = await device()
    await old.engine.login('a@example.test', 'pw')
    // created last, so the restore module imported below belongs to this device
    const a = await device()
    await a.engine.login('a@example.test', 'pw')
    a.s.addFood(meal('Im Backup'))
    await a.sync()
    const backup = await backupOf(a)
    // after the backup: one entry is added and deleted again, the backed-up one is deleted too
    a.s.addFood(meal('Danach'))
    await a.sync()
    await old.sync()
    expect(names(old.s.foods)).toEqual(['Im Backup', 'Danach'])
    server.online = false // the old device goes offline holding both
    await vi.advanceTimersByTimeAsync(60_000)
    server.online = true
    a.s.removeFood(a.s.foods.find((f) => f.name === 'Danach')!.id)
    a.s.removeFood(a.s.foods.find((f) => f.name === 'Im Backup')!.id)
    await a.sync()
    const { restoreBackup } = await import('../../sync/restore')
    expect(restoreBackup(backup)).toBe(true)
    await a.sync()
    // the old device comes back online
    await old.sync()
    await a.sync()
    for (const d of [a, old]) expect(names(d.s.foods)).toEqual(['Im Backup'])
    expect(names(server.doc(server.accounts[0])!.data.state.foods as never)).toEqual(['Im Backup'])
  })
})

describe('sync engine: restoring the stash', () => {
  async function switched() {
    server.add('x@example.test')
    const y = server.add('y@example.test')
    server.docs.set(y.id, { rev: 1, data: docWith('Y-Essen') })
    const d = await device()
    await d.engine.login('x@example.test', 'pw')
    d.s.addFood(meal('X-Essen'))
    await d.sync()
    await d.engine.logout(false)
    await d.engine.login('y@example.test', 'pw')
    await d.sync()
    return { d, y }
  }

  it('restores the previous device data through the backup path and removes the stash', async () => {
    const { d, y } = await switched()
    expect(d.engine.readStash()?.savedAt).toBe(Date.now() - 2000)
    const { restoreStash } = await import('../../sync/restore')
    expect(restoreStash()).toBe(true)
    await d.sync()
    expect(names(d.s.foods)).toEqual(['X-Essen'])
    // restored as a local change: it reaches the signed-in account
    expect(names(server.doc(y)!.data.state.foods as never)).toEqual(['X-Essen'])
    expect(d.engine.readStash()).toBeUndefined()
    expect(d.storage.getItem('zyklus-stash')).toBeNull()
  })

  it('discards the stash on request, and keeps a stash that does not pass the backup check', async () => {
    const { d } = await switched()
    const { restoreStash } = await import('../../sync/restore')
    d.storage.setItem('zyklus-stash', JSON.stringify({ savedAt: 1, doc: { v: 2, state: { sessions: [] }, stamps: {}, tombstones: {} } }))
    const before = canon(d.doc())
    expect(restoreStash()).toBe(false)
    expect(canon(d.doc())).toBe(before)
    expect(d.engine.readStash()).toBeDefined()
    d.engine.discardStash()
    expect(d.engine.readStash()).toBeUndefined()
    d.storage.setItem('zyklus-stash', 'kaputt')
    expect(d.engine.readStash()).toBeUndefined()
  })
})

describe('sync engine: error texts', () => {
  it('every error code of the sync API has its own text in de, en and vi', async () => {
    const { translate, LANGS } = await import('../../i18n')
    for (const lang of LANGS) {
      for (const code of ['account_mismatch', 'client_outdated', 'conflict']) {
        const key = `account.apiError.${code}`
        expect(translate(lang, key), `${lang} ${code}`).not.toBe(key)
      }
    }
  })
})

describe('sync engine: the server lost the document', () => {
  it('a conflict without a server copy (rev 0, data null) uploads this device as the first copy', async () => {
    const a = server.add('a@example.test')
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    d.s.addFood(meal('Apfel'))
    await d.sync()
    expect(d.engine.useSync.getState().rev).toBeGreaterThan(0)
    server.docs.clear()
    d.s.addFood(meal('Birne'))
    // the upload alone, no pull in between
    await vi.advanceTimersByTimeAsync(2000)
    await settle()
    expect(names(server.doc(a)?.data.state.foods as never)).toEqual(['Apfel', 'Birne'])
    expect(server.puts().at(-2)).toMatchObject({ status: 409 })
    expect(d.engine.useSync.getState()).toMatchObject({ status: 'ok', rev: server.doc(a)!.rev })
  })
})

describe('sync engine: binding and data are stored together', () => {
  it('a tab opened between a stale tab writing X data and the Y tab writing its binding uploads nothing into Y', async () => {
    const x = server.add('x@example.test')
    const y = server.add('y@example.test')
    server.docs.set(y.id, { rev: 1, data: docWith('Y-Essen') })
    const storage = new MemStorage()
    const tab1 = await device(storage)
    await tab1.engine.login('x@example.test', 'pw')
    tab1.s.addFood(meal('X-Essen'))
    await tab1.sync()
    const tab2 = await device(storage)
    await tab2.engine.logout(false)
    await tab2.engine.login('y@example.test', 'pw')
    await tab2.sync()
    // the stale X tab writes its data (zyklus-v1) ...
    tab1.s.addFood(meal('X-Neu'))
    // ... then the Y tab writes its sync state (zyklus-sync) again, without touching the data
    await tab2.engine.syncNow()
    // a new tab opens right now
    const tab3 = await device(storage)
    await tab3.engine.syncNow()
    expect(names(server.doc(y)!.data.state.foods as never)).toEqual(['Y-Essen'])
    await tab3.engine.checkSession()
    await tab3.sync()
    expect(names(server.doc(y)!.data.state.foods as never)).toEqual(['Y-Essen'])
    expect(names(tab3.s.foods)).toEqual(['Y-Essen'])
    expect(names(server.doc(x)!.data.state.foods as never)).toEqual(['X-Essen'])
  })
})

describe('sync engine: late session checks', () => {
  it('a session check that answers after a logout adopts nobody', async () => {
    const a = server.add('a@example.test')
    const b = server.add('b@example.test')
    server.docs.set(b.id, { rev: 1, data: docWith('B-Essen') })
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    d.s.addFood(meal('A-Essen'))
    await d.sync()
    // another tab signs in as B: this tab's next sync gets 409 and checks the session
    server.session = b.id
    const release = server.gate('GET', '/auth/me')
    await d.engine.syncNow()
    await settle()
    // the check is still on its way (it will say "B") when the user signs out here
    await d.engine.logout(false)
    release()
    await settle()
    await d.sync()
    expect(d.s.owner).toEqual({ origin: ORIGIN, id: a.id, createdAt: a.createdAt })
    expect(names(d.s.foods)).toEqual(['A-Essen'])
    expect(d.storage.getItem('zyklus-stash')).toBeNull()
    expect(d.engine.useSync.getState().user).toBeUndefined()
  })

  it('a session check that answers "nobody" after the same account signed in again does not sign it out', async () => {
    server.add('a@example.test')
    const d = await device()
    await d.engine.login('a@example.test', 'pw')
    await d.engine.logout(false)
    const release = server.gate('GET', '/auth/me')
    const check = d.engine.checkSession()
    await settle()
    await d.engine.login('a@example.test', 'pw')
    release()
    await check
    expect(d.engine.useSync.getState().user?.email).toBe('a@example.test')
  })
})
