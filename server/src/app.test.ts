import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, createApp } from './app.ts'
import type { Config } from './config.ts'
import { openDb, type DB } from './db.ts'
import type { Mail } from './mail.ts'

const ORIGIN = 'https://mci.example.test'
const cfg: Config = { port: 0, appOrigin: ORIGIN, dataDir: ':memory:', secureCookies: true, mailFrom: 'test@example.test' }

let db: DB
let mails: Mail[]
let clock: number
let app: ReturnType<typeof createApp>['app']

beforeEach(() => {
  db = openDb(':memory:')
  mails = []
  clock = Date.UTC(2026, 9, 15)
  app = createApp({ db, cfg, mail: async (m) => void mails.push(m), now: () => clock }).app
})

type Res = { status: number; body: Record<string, unknown>; cookie?: string }

async function call(method: string, path: string, opts: { body?: unknown; cookie?: string; origin?: string | null; ip?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = { 'x-forwarded-for': opts.ip ?? '203.0.113.7' }
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN
  if (opts.cookie) headers.cookie = opts.cookie
  const res = await app.request(`/api${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
  const setCookie = res.headers.get('set-cookie') ?? undefined
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, cookie: setCookie?.split(';')[0] }
}

const tokenFrom = (m: Mail) => /token=([\w-]+)/.exec(m.text)![1]

async function register(email = 'nam@example.test', password = 'langes-passwort-1') {
  const r = await call('POST', '/auth/register', { body: { email, password, consent: true } })
  return r
}

describe('registration and login', () => {
  it('registers, sets a hardened cookie and sends a verification mail', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'Nam@Example.test ', password: 'langes-passwort-1', consent: true }),
    })
    expect(res.status).toBe(201)
    const cookie = res.headers.get('set-cookie')!
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Secure/)
    expect(cookie).toMatch(/SameSite=Lax/)
    expect(cookie).toMatch(/Path=\/api/)
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toBe('nam@example.test')
    expect(mails[0].text).toContain(`${ORIGIN}/#/konto/bestaetigen?token=`)
  })

  it('rejects weak input and missing consent', async () => {
    expect((await call('POST', '/auth/register', { body: { email: 'x', password: 'langes-passwort-1', consent: true } })).status).toBe(400)
    expect((await call('POST', '/auth/register', { body: { email: 'a@b.de', password: 'kurz', consent: true } })).body.error).toBe('password')
    expect((await call('POST', '/auth/register', { body: { email: 'a@b.de', password: 'langes-passwort-1' } })).body.error).toBe('consent')
  })

  it('refuses a duplicate email', async () => {
    await register()
    expect((await register('NAM@example.test')).status).toBe(409)
  })

  it('logs in with the right password only, with a generic error', async () => {
    await register()
    const bad = await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'falsch-falsch' } })
    const unknown = await call('POST', '/auth/login', { body: { email: 'niemand@example.test', password: 'falsch-falsch' } })
    expect(bad.status).toBe(401)
    expect(unknown.body.message).toBe(bad.body.message)
    const ok = await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })
    expect(ok.status).toBe(200)
    const me = await call('GET', '/auth/me', { cookie: ok.cookie })
    expect((me.body.user as { email: string }).email).toBe('nam@example.test')
  })

  it('locks an email after 5 failed logins', async () => {
    await register()
    for (let i = 0; i < 5; i++) await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'falsch-falsch' } })
    const locked = await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })
    expect(locked.status).toBe(429)
    clock += 16 * 60 * 1000
    expect((await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })).status).toBe(200)
  })

  it('limits registrations per IP', async () => {
    for (let i = 0; i < 5; i++) await register(`u${i}@example.test`)
    expect((await register('u9@example.test')).status).toBe(429)
  })

  it('logout ends the session', async () => {
    const { cookie } = await register()
    await call('POST', '/auth/logout', { body: {}, cookie })
    expect((await call('GET', '/auth/me', { cookie })).body.user).toBeNull()
    expect((await call('GET', '/state', { cookie })).status).toBe(401)
  })

  it('sessions expire', async () => {
    const { cookie } = await register()
    clock += 31 * 86_400_000
    expect((await call('GET', '/auth/me', { cookie })).body.user).toBeNull()
  })
})

describe('csrf', () => {
  it('rejects foreign or missing origins and non-JSON bodies', async () => {
    expect((await call('POST', '/auth/register', { body: { email: 'a@b.de', password: 'langes-passwort-1', consent: true }, origin: 'https://evil.test' })).status).toBe(403)
    expect((await call('POST', '/auth/register', { body: { email: 'a@b.de', password: 'langes-passwort-1', consent: true }, origin: null })).status).toBe(403)
    const res = await app.request('/api/auth/login', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'text/plain' }, body: '{}' })
    expect(res.status).toBe(400)
  })
})

describe('email verification and password reset', () => {
  it('verifies with the mailed token, once', async () => {
    const { cookie } = await register()
    const token = tokenFrom(mails[0])
    expect((await call('POST', '/auth/verify', { body: { token } })).status).toBe(200)
    expect(((await call('GET', '/auth/me', { cookie })).body.user as { verified: boolean }).verified).toBe(true)
    expect((await call('POST', '/auth/verify', { body: { token } })).status).toBe(400)
  })

  it('answers forgot-password the same for unknown emails', async () => {
    await register()
    mails = []
    const a = await call('POST', '/auth/forgot', { body: { email: 'nam@example.test' } })
    const b = await call('POST', '/auth/forgot', { body: { email: 'niemand@example.test' } })
    expect(a.body).toEqual(b.body)
    expect(mails).toHaveLength(1)
  })

  it('resets the password, kills old sessions, rejects expired links', async () => {
    const { cookie: old } = await register()
    await call('POST', '/auth/forgot', { body: { email: 'nam@example.test' } })
    const token = tokenFrom(mails[1])
    const r = await call('POST', '/auth/reset', { body: { token, password: 'ganz-neues-passwort' } })
    expect(r.status).toBe(200)
    expect((await call('GET', '/auth/me', { cookie: old })).body.user).toBeNull()
    expect((await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'ganz-neues-passwort' } })).status).toBe(200)

    await call('POST', '/auth/forgot', { body: { email: 'nam@example.test' } })
    clock += 2 * 60 * 60 * 1000
    expect((await call('POST', '/auth/reset', { body: { token: tokenFrom(mails[2]), password: 'noch-ein-passwort' } })).status).toBe(400)
  })

  it('changes the password with the current one and logs out other devices', async () => {
    const { cookie: phone } = await register()
    const laptop = (await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })).cookie
    expect((await call('POST', '/auth/change-password', { body: { current: 'falsch-falsch', next: 'ganz-neues-passwort' }, cookie: phone })).status).toBe(403)
    expect((await call('POST', '/auth/change-password', { body: { current: 'langes-passwort-1', next: 'ganz-neues-passwort' }, cookie: phone })).status).toBe(200)
    expect((await call('GET', '/auth/me', { cookie: phone })).status).toBe(200)
    expect((await call('GET', '/auth/me', { cookie: laptop })).body.user).toBeNull()
  })

  it('removes unverified accounts after 7 days', async () => {
    await register('a@example.test')
    await register('b@example.test')
    await call('POST', '/auth/verify', { body: { token: tokenFrom(mails[1]) } })
    clock += 8 * 86_400_000
    expect(cleanup(db, clock).users).toBe(1)
  })
})

describe('state sync', () => {
  const doc = (n: number) => ({ v: 1, state: { n }, stamps: {}, tombstones: {} })

  it('needs a session', async () => {
    expect((await call('GET', '/state')).status).toBe(401)
  })

  it('stores revisions and reports conflicts with the server copy', async () => {
    const { cookie } = await register()
    expect((await call('GET', '/state', { cookie })).body).toEqual({ rev: 0, data: null, updatedAt: null })
    expect((await call('PUT', '/state', { cookie, body: { rev: 0, data: doc(1) } })).body.rev).toBe(1)
    expect((await call('PUT', '/state', { cookie, body: { rev: 1, data: doc(2) } })).body.rev).toBe(2)
    const stale = await call('PUT', '/state', { cookie, body: { rev: 1, data: doc(3) } })
    expect(stale.status).toBe(409)
    expect(stale.body.rev).toBe(2)
    expect(stale.body.data).toEqual(doc(2))
    const again = await call('PUT', '/state', { cookie, body: { rev: 0, data: doc(4) } })
    expect(again.status).toBe(409)
  })

  it('keeps users apart', async () => {
    const a = await register('a@example.test')
    const b = await register('b@example.test')
    await call('PUT', '/state', { cookie: a.cookie, body: { rev: 0, data: doc(1) } })
    expect((await call('GET', '/state', { cookie: b.cookie })).body.data).toBeNull()
  })

  it('validates the document', async () => {
    const { cookie } = await register()
    expect((await call('PUT', '/state', { cookie, body: { rev: 0, data: { v: 2 } } })).status).toBe(400)
    expect((await call('PUT', '/state', { cookie, body: { rev: -1, data: doc(1) } })).status).toBe(400)
  })
})

describe('account', () => {
  it('exports and deletes everything with the password', async () => {
    const { cookie } = await register()
    await call('PUT', '/state', { cookie, body: { rev: 0, data: { v: 1, state: { x: 1 }, stamps: {}, tombstones: {} } } })
    const exp = await call('GET', '/account/export', { cookie })
    expect((exp.body.data as { state: unknown }).state).toEqual({ x: 1 })
    expect((await call('POST', '/account/delete', { cookie, body: { password: 'falsch-falsch' } })).status).toBe(403)
    expect((await call('POST', '/account/delete', { cookie, body: { password: 'langes-passwort-1' } })).status).toBe(200)
    expect((await call('GET', '/auth/me', { cookie })).body.user).toBeNull()
    expect(db.prepare('SELECT COUNT(*) AS n FROM states').get()).toEqual({ n: 0 })
    expect((await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })).status).toBe(401)
  })
})
