import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, createApp } from './app.ts'
import type { Config } from './config.ts'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb, type DB } from './db.ts'
import { maskEmail, type Mail } from './mail.ts'

const ORIGIN = 'https://mci.example.test'
const cfg: Config = { port: 0, appOrigin: ORIGIN, dataDir: ':memory:', secureCookies: true, mailFrom: 'test@example.test', registerLimit: 5 }

let db: DB
let mails: Mail[]
let clock: number
let app: ReturnType<typeof createApp>['app']

beforeEach(() => {
  db = openDb(':memory:')
  mails = []
  clock = Date.UTC(2026, 9, 15)
  app = createApp({ db, cfg, mail: async (m) => void mails.push(m), now: () => clock, sleep: async () => {} }).app
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

/** Registration only: it answers the same for every address and starts no session. */
const registerRaw = (email = 'nam@example.test', password = 'langes-passwort-1', locale?: string) =>
  call('POST', '/auth/register', { body: { email, password, consent: true, locale } })

/** The whole sign-up: register, then follow the confirmation link, which signs the account in. */
async function register(email = 'nam@example.test', password = 'langes-passwort-1') {
  const r = await registerRaw(email, password)
  if (r.status !== 202) return r
  const m = mails.at(-1)
  return m ? await call('POST', '/auth/verify', { body: { token: tokenFrom(m) } }) : r
}

describe('registration and login', () => {
  it('registers without a session and sends a verification mail', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'Nam@Example.test ', password: 'langes-passwort-1', consent: true }),
    })
    expect(res.status).toBe(202)
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toBe('nam@example.test')
    expect(mails[0].text).toContain(`${ORIGIN}/#/konto/bestaetigen?token=`)
  })

  it('the confirmation link signs in and sets a hardened cookie', async () => {
    await registerRaw()
    const res = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ token: tokenFrom(mails[0]) }),
    })
    expect(res.status).toBe(200)
    const cookie = res.headers.get('set-cookie')!
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Secure/)
    expect(cookie).toMatch(/SameSite=Lax/)
    expect(cookie).toMatch(/Path=\/api/)
  })

  it('rejects weak input and missing consent', async () => {
    expect((await call('POST', '/auth/register', { body: { email: 'x', password: 'langes-passwort-1', consent: true } })).status).toBe(400)
    expect((await call('POST', '/auth/register', { body: { email: 'a@b.de', password: 'kurz', consent: true } })).body.error).toBe('password_short')
    expect((await call('POST', '/auth/register', { body: { email: 'a@b.de', password: 'langes-passwort-1' } })).body.error).toBe('consent')
  })

  it('tells a sign-up for a known address nothing, and mails the owner instead', async () => {
    await register()
    mails = []
    const fresh = await registerRaw('neu@example.test')
    const taken = await registerRaw('NAM@example.test')
    // identical answer: no status, body or cookie gives the existence of the account away
    expect(taken.status).toBe(fresh.status)
    expect(taken.body).toEqual(fresh.body)
    expect(taken.cookie).toBeUndefined()
    // the difference only shows in the mailbox of the address itself
    const toOwner = mails.filter((m) => m.to === 'nam@example.test')
    expect(toOwner).toHaveLength(1)
    expect(toOwner[0].text).not.toContain('token=')
    expect((db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n).toBe(2)
  })

  it('refuses to sign in before the address is confirmed', async () => {
    await registerRaw()
    const r = await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })
    expect(r.status).toBe(403)
    expect(r.body.error).toBe('unverified')
    expect(r.cookie).toBeUndefined()
    await call('POST', '/auth/verify', { body: { token: tokenFrom(mails[0]) } })
    expect((await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })).status).toBe(200)
  })

  it('answers a new confirmation link the same for every address', async () => {
    await registerRaw()
    mails = []
    const a = await call('POST', '/auth/resend', { body: { email: 'nam@example.test' } })
    const b = await call('POST', '/auth/resend', { body: { email: 'niemand@example.test' } })
    expect(a.status).toBe(b.status)
    expect(a.body).toEqual(b.body)
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toBe('nam@example.test')
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

  it('slows wrong guesses down but never locks the address out', async () => {
    await register()
    for (let i = 0; i < 6; i++) await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'falsch-falsch' } })
    // the owner still gets in: a hard block would let anyone keep a known account signed out
    expect((await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })).status).toBe(200)
  })

  it('stops a flood of logins from one address', async () => {
    await register()
    for (let i = 0; i < 20; i++) await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'falsch-falsch' } })
    expect((await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })).status).toBe(429)
    clock += 16 * 60 * 1000
    expect((await call('POST', '/auth/login', { body: { email: 'nam@example.test', password: 'langes-passwort-1' } })).status).toBe(200)
    // 20 scrypt checks are the point of the exercise, so this one needs longer than the default
  }, 30_000)

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
    await registerRaw()
    const token = tokenFrom(mails[0])
    const ok = await call('POST', '/auth/verify', { body: { token } })
    expect(ok.status).toBe(200)
    expect(((await call('GET', '/auth/me', { cookie: ok.cookie })).body.user as { verified: boolean }).verified).toBe(true)
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
    await registerRaw('a@example.test')
    await register('b@example.test')
    clock += 8 * 86_400_000
    // a is still unconfirmed, b followed its link
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

describe('language', () => {
  it('stores the locale at registration and mails in that language', async () => {
    const r = await registerRaw('vi@example.test', 'langes-passwort-1', 'vi')
    expect(r.status).toBe(202)
    expect(mails[0].subject).toContain('xác nhận')
    await call('POST', '/auth/forgot', { body: { email: 'vi@example.test' } })
    expect(mails[1].subject).toBe('Zyklus: đặt lại mật khẩu')
  })

  it('falls back to German for unknown locales', async () => {
    const r = await call('POST', '/auth/register', { body: { email: 'xx@example.test', password: 'langes-passwort-1', consent: true, locale: 'fr' } })
    expect(r.status).toBe(202)
    expect((await call('POST', '/auth/verify', { body: { token: tokenFrom(mails[0]) } })).body.user).toMatchObject({ locale: 'de' })
    expect(mails[0].subject).toContain('bestätige')
  })

  it('switches the mail language via /account/locale', async () => {
    const { cookie } = await register()
    expect((await call('POST', '/account/locale', { cookie, body: { locale: 'en' } })).status).toBe(200)
    expect(((await call('GET', '/auth/me', { cookie })).body.user as { locale: string }).locale).toBe('en')
    await call('POST', '/auth/change-password', { cookie, body: { current: 'langes-passwort-1', next: 'ganz-neues-passwort' } })
    expect(mails.at(-1)!.subject).toBe('Zyklus: your password was changed')
  })

  it('adds the locale column to databases from the previous version', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'zyklus-')), 'old.db')
    const old = new DatabaseSync(file)
    old.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, email_verified_at INTEGER, consent_at INTEGER NOT NULL, created_at INTEGER NOT NULL)')
    old.exec("INSERT INTO users (email, password_hash, consent_at, created_at) VALUES ('alt@example.test', 'x', 1, 1)")
    old.close()
    const db2 = openDb(file)
    expect(db2.prepare('SELECT locale FROM users').get()).toEqual({ locale: 'de' })
  })
})

describe('mail log', () => {
  it('masks addresses', () => {
    expect(maskEmail('erika.musterfrau@example.com')).toBe('er***@example.com')
    expect(maskEmail('a@b.de')).toBe('a***@b.de')
    expect(maskEmail('kaputt')).toBe('***')
  })
})

describe('friends and challenges', () => {
  const TODAY = '2026-10-15'
  const day = (n: number) => new Date(Date.UTC(2026, 9, 15 + n)).toISOString().slice(0, 10)
  /** a synced document with a name and cardio on the given day offsets */
  const doc = (name: string, cardioDays: number[], extra: Record<string, unknown> = {}) => ({
    v: 1,
    state: { profile: { name, daysPerWeek: 3, weightKg: 80 }, settings: { mode: 'normal' }, frozenDays: [], sessions: [], mobility: [], foods: [{ date: TODAY, name: 'Geheim' }], cardio: cardioDays.map((n, i) => ({ id: `c${i}`, date: day(n), minutes: 30 })), ...extra },
    stamps: {},
    tombstones: {},
  })
  async function user(email: string, name: string, cardioDays: number[] = []) {
    const { cookie } = await register(email)
    await call('PUT', '/state', { cookie: cookie!, body: { rev: 0, data: doc(name, cardioDays) } })
    return cookie!
  }

  it('connects two accounts through an invite code and shows only the summary', async () => {
    const a = await user('a@example.test', 'Anna', [-2, -1, 0])
    const b = await user('b@example.test', 'Ben')
    // a GET must not write, so /social/me only reports a code that already exists
    expect((await call('GET', `/social/me?today=${TODAY}`, { cookie: a })).body.code).toBeNull()
    const code = (await call('POST', '/social/invite/rotate', { cookie: a, body: {} })).body.code as string
    expect(code).toMatch(/^[A-Z2-9]{8}$/)
    expect((await call('GET', `/social/me?today=${TODAY}`, { cookie: a })).body.code).toBe(code)

    expect((await call('GET', `/social/invite/${code.toLowerCase()}`, { cookie: b })).body).toEqual({ name: 'Anna', self: false, friends: false })
    expect((await call('POST', `/social/invite/${code}/accept`, { cookie: a, body: {} })).body.error).toBe('invite_self')
    const accepted = await call('POST', `/social/invite/${code}/accept?today=${TODAY}`, { cookie: b, body: {} })
    expect(accepted.status).toBe(200)
    // accepting twice is harmless
    expect((await call('POST', `/social/invite/${code}/accept`, { cookie: b, body: {} })).status).toBe(200)

    const friends = (await call('GET', `/social/friends?today=${TODAY}`, { cookie: b })).body.friends as Record<string, unknown>[]
    expect(friends).toHaveLength(1)
    expect(friends[0]).toMatchObject({ name: 'Anna', daily: { count: 3, activeToday: true }, weekly: { active: 3, goal: 3, done: true } })
    // no food, weight or workout details leak to friends
    expect(JSON.stringify(friends)).not.toMatch(/Geheim|weightKg|cardio/)
    expect(((await call('GET', `/social/me?today=${TODAY}`, { cookie: a })).body.counts as Record<string, number>).friends).toBe(1)

    const annaId = friends[0].id
    expect((await call('POST', `/social/friends/${annaId}/remove`, { cookie: b, body: {} })).status).toBe(200)
    expect((await call('GET', '/social/friends', { cookie: a })).body.friends).toEqual([])
  })

  it('a new invite code retires the old one', async () => {
    const a = await user('a@example.test', 'Anna')
    const b = await user('b@example.test', 'Ben')
    const old = (await call('POST', '/social/invite/rotate', { cookie: a, body: {} })).body.code
    const fresh = (await call('POST', '/social/invite/rotate', { cookie: a, body: {} })).body.code
    expect(fresh).not.toBe(old)
    expect((await call('POST', `/social/invite/${old}/accept`, { cookie: b, body: {} })).body.error).toBe('invite_unknown')
  })

  it('sums a group goal and tracks a streak challenge per member', async () => {
    const a = await user('a@example.test', 'Anna', [0])
    const b = await user('b@example.test', 'Ben', [0])
    const code = (await call('POST', '/social/invite/rotate', { cookie: a, body: {} })).body.code
    await call('POST', `/social/invite/${code}/accept`, { cookie: b, body: {} })
    const bId = ((await call('GET', '/social/friends', { cookie: a })).body.friends as { id: number }[])[0].id

    const goal = await call('POST', `/social/challenges?today=${TODAY}`, { cookie: a, body: { kind: 'goal', title: 'Zusammen 4 Tage', metric: 'active_days', days: 7, target: 4, invite: [bId] } })
    expect(goal.status).toBe(201)
    const g = goal.body.challenge as { id: string; total: number; status: string; members: unknown[]; end: string }
    expect(g).toMatchObject({ total: 2, status: 'running', end: day(6) })
    expect(g.members).toHaveLength(2)

    // Ben logs two more days: the group reaches 4
    await call('PUT', '/state', { cookie: b, body: { rev: 1, data: doc('Ben', [0, 1, 2]) } })
    const later = await call('GET', `/social/challenges/${g.id}?today=${day(2)}`, { cookie: a })
    expect(later.body.challenge).toMatchObject({ total: 4, status: 'done' })
    expect(((await call('GET', `/social/me?today=${day(2)}`, { cookie: a })).body.counts as Record<string, number>).team).toBe(1)

    const streak = await call('POST', `/social/challenges?today=${TODAY}`, { cookie: a, body: { kind: 'streak', days: 7 } })
    const s = streak.body.challenge as { id: string; code: string }
    expect((await call('POST', `/social/challenges/join/${s.code}?today=${TODAY}`, { cookie: b, body: {} })).status).toBe(200)
    const view = (await call('GET', `/social/challenges/${s.id}?today=${day(2)}`, { cookie: b })).body.challenge as { members: { name: string; status: string }[] }
    // Anna missed day 1, Ben is still in
    expect(view.members.map((m) => [m.name, m.status])).toEqual([['Anna', 'out'], ['Ben', 'running']])

    // strangers cannot read a challenge, leaving the last member removes it
    const c = await user('c@example.test', 'Carla')
    expect((await call('GET', `/social/challenges/${s.id}`, { cookie: c })).status).toBe(404)
    await call('POST', `/social/challenges/${s.id}/leave`, { cookie: a, body: {} })
    await call('POST', `/social/challenges/${s.id}/leave`, { cookie: b, body: {} })
    expect(db.prepare('SELECT COUNT(*) AS n FROM challenges WHERE id = ?').get(s.id)).toEqual({ n: 0 })
  })

  it('rejects invalid challenges and cleans up with the account', async () => {
    const a = await user('a@example.test', 'Anna')
    expect((await call('POST', '/social/challenges', { cookie: a, body: { kind: 'goal', metric: 'minutes', days: 7, target: 0 } })).status).toBe(400)
    expect((await call('POST', '/social/challenges', { cookie: a, body: { kind: 'streak', days: 5 } })).status).toBe(400)
    await call('POST', '/social/challenges', { cookie: a, body: { kind: 'streak', days: 14 } })
    await call('POST', '/account/delete', { cookie: a, body: { password: 'langes-passwort-1' } })
    for (const t of ['summaries', 'invites', 'challenges', 'challenge_members']) expect(db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get()).toEqual({ n: 0 })
  })
})
