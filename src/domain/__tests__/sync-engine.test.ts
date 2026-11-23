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
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, String(v))
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

  fetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    if (!this.online) throw new TypeError('Failed to fetch')
    const method = init.method ?? 'GET'
    const path = input.replace(/^\/api/, '')
    const account = new Headers(init.headers).get('x-zyklus-account') ?? undefined
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    const [status, out] = this.handle(method, path, account, body)
    this.log.push({ method, path, account, status, body })
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
      if (!cur) return [500, { error: 'server' }]
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
      for (const k of Object.keys(st)) if (typeof st[k] !== 'function' && k !== 'syncMeta') state[k] = st[k]
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
