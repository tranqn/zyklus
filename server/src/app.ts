import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Config } from './config.ts'
import { DUMMY_HASH, hashPassword, newToken, sha256, verifyPassword } from './crypto.ts'
import type { DB, UserRow } from './db.ts'
import { passwordChangedMail, resetMail, verifyMail, type Mailer } from './mail.ts'
import { RateLimiter } from './ratelimit.ts'

const COOKIE = 'zyk_session'
const DAY = 86_400_000
const SESSION_TTL = 30 * DAY
const VERIFY_TTL = 7 * DAY
const RESET_TTL = 60 * 60 * 1000
export const MAX_STATE_BYTES = 5 * 1024 * 1024
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

export interface Deps {
  db: DB
  cfg: Config
  mail: Mailer
  now?: () => number
}

type Vars = { Variables: { user: UserRow; sessionHash: string } }

export function createApp({ db, cfg, mail, now = Date.now }: Deps) {
  const app = new Hono<Vars>().basePath('/api')

  const limits = {
    register: new RateLimiter(cfg.registerLimit, 60 * 60 * 1000, now),
    loginIp: new RateLimiter(20, 15 * 60 * 1000, now),
    loginEmail: new RateLimiter(5, 15 * 60 * 1000, now),
    forgotIp: new RateLimiter(10, 60 * 60 * 1000, now),
    forgotEmail: new RateLimiter(3, 60 * 60 * 1000, now),
    resend: new RateLimiter(3, 60 * 60 * 1000, now),
  }

  const q = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    insertUser: db.prepare('INSERT INTO users (email, password_hash, consent_at, created_at) VALUES (?, ?, ?, ?)'),
    setPassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
    verifyUser: db.prepare('UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL'),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)'),
    sessionUser: db.prepare('SELECT u.*, s.expires_at AS s_expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?'),
    touchSession: db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    deleteOtherSessions: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?'),
    deleteAllSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    insertToken: db.prepare('INSERT INTO tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)'),
    findToken: db.prepare('SELECT * FROM tokens WHERE token_hash = ? AND kind = ?'),
    deleteToken: db.prepare('DELETE FROM tokens WHERE token_hash = ?'),
    deleteUserTokens: db.prepare('DELETE FROM tokens WHERE user_id = ? AND kind = ?'),
    getState: db.prepare('SELECT rev, data, updated_at FROM states WHERE user_id = ?'),
    insertState: db.prepare('INSERT INTO states (user_id, rev, data, updated_at) VALUES (?, 1, ?, ?)'),
    updateState: db.prepare('UPDATE states SET rev = rev + 1, data = ?, updated_at = ? WHERE user_id = ? AND rev = ?'),
  }

  const ip = (c: Context) => c.req.header('x-forwarded-for')?.split(',').pop()?.trim() || 'local'
  const publicUser = (u: UserRow) => ({ id: u.id, email: u.email, verified: u.email_verified_at != null, createdAt: u.created_at })
  const fail = (c: Context, status: 400 | 401 | 403 | 404 | 409 | 413 | 429, error: string, message: string) => c.json({ error, message }, status)

  function startSession(c: Context, userId: number) {
    const token = newToken()
    const t = now()
    q.insertSession.run(sha256(token), userId, t, t + SESSION_TTL, (c.req.header('user-agent') ?? '').slice(0, 200))
    setCookie(c, COOKIE, token, { httpOnly: true, secure: cfg.secureCookies, sameSite: 'Lax', path: '/api', maxAge: SESSION_TTL / 1000 })
  }

  async function sendToken(user: UserRow, kind: 'verify' | 'reset') {
    q.deleteUserTokens.run(user.id, kind)
    const token = newToken()
    q.insertToken.run(sha256(token), user.id, kind, now() + (kind === 'verify' ? VERIFY_TTL : RESET_TTL))
    const m = kind === 'verify' ? verifyMail(cfg.appOrigin, token) : resetMail(cfg.appOrigin, token)
    await mail({ to: user.email, ...m })
  }

  function passwordProblem(pw: unknown): string | null {
    if (typeof pw !== 'string' || pw.length < 10) return 'Das Passwort braucht mindestens 10 Zeichen.'
    if (pw.length > 200) return 'Das Passwort ist zu lang.'
    return null
  }

  async function readJson(c: Context): Promise<Record<string, unknown> | null> {
    try {
      const body = await c.req.json()
      return body && typeof body === 'object' && !Array.isArray(body) ? body : null
    } catch {
      return null
    }
  }

  // Every response is private and uncachable.
  app.use('*', async (c, next) => {
    await next()
    c.header('Cache-Control', 'no-store')
    c.header('X-Content-Type-Options', 'nosniff')
  })

  // CSRF: state-changing requests must come from the app's own origin as JSON.
  app.use('*', async (c, next) => {
    if (c.req.method === 'GET' || c.req.method === 'HEAD') return next()
    if (c.req.header('origin') !== cfg.appOrigin) return fail(c, 403, 'origin', 'Anfrage von fremder Herkunft abgelehnt.')
    if (!c.req.header('content-type')?.startsWith('application/json')) return fail(c, 400, 'content_type', 'JSON erwartet.')
    return next()
  })

  const requireUser = async (c: Context<Vars>, next: () => Promise<void>) => {
    const token = getCookie(c, COOKIE)
    if (!token) return fail(c, 401, 'unauthenticated', 'Bitte melde dich an.')
    const hash = sha256(token)
    const row = q.sessionUser.get(hash) as (UserRow & { s_expires: number }) | undefined
    if (!row || row.s_expires < now()) {
      if (row) q.deleteSession.run(hash)
      deleteCookie(c, COOKIE, { path: '/api' })
      return fail(c, 401, 'unauthenticated', 'Sitzung abgelaufen, bitte melde dich neu an.')
    }
    // sliding expiry, written at most once a day
    if (row.s_expires - now() < SESSION_TTL - DAY) q.touchSession.run(now() + SESSION_TTL, hash)
    c.set('user', row)
    c.set('sessionHash', hash)
    await next()
  }

  app.get('/health', (c) => {
    db.prepare('SELECT 1').get()
    return c.json({ ok: true })
  })

  const smallBody = bodyLimit({ maxSize: 16 * 1024, onError: (c) => fail(c, 413, 'too_large', 'Anfrage zu groß.') })

  app.post('/auth/register', smallBody, async (c) => {
    if (!limits.register.take(ip(c))) return fail(c, 429, 'rate_limited', 'Zu viele Registrierungen. Versuch es später erneut.')
    const body = await readJson(c)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) return fail(c, 400, 'email', 'Bitte gib eine gültige E-Mail-Adresse ein.')
    const pwErr = passwordProblem(body?.password)
    if (pwErr) return fail(c, 400, 'password', pwErr)
    if (body?.consent !== true) return fail(c, 400, 'consent', 'Bitte stimme der Verarbeitung deiner Gesundheitsdaten zu.')
    if (q.userByEmail.get(email)) return fail(c, 409, 'exists', 'Für diese E-Mail gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.')
    const t = now()
    const hash = await hashPassword(body!.password as string)
    const res = q.insertUser.run(email, hash, t, t)
    const user = q.userById.get(Number(res.lastInsertRowid)) as unknown as UserRow
    startSession(c, user.id)
    await sendToken(user, 'verify').catch((e) => console.error('verify mail failed', e))
    return c.json({ user: publicUser(user) }, 201)
  })

  app.post('/auth/login', smallBody, async (c) => {
    const body = await readJson(c)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (limits.loginEmail.blocked(email) || !limits.loginIp.take(ip(c))) {
      return fail(c, 429, 'rate_limited', 'Zu viele Anmeldeversuche. Warte 15 Minuten oder setze dein Passwort zurück.')
    }
    const user = q.userByEmail.get(email) as UserRow | undefined
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)
    if (!user || !ok) {
      limits.loginEmail.take(email)
      return fail(c, 401, 'credentials', 'E-Mail oder Passwort ist falsch.')
    }
    limits.loginEmail.reset(email)
    startSession(c, user.id)
    return c.json({ user: publicUser(user) })
  })

  app.post('/auth/logout', async (c) => {
    const token = getCookie(c, COOKIE)
    if (token) q.deleteSession.run(sha256(token))
    deleteCookie(c, COOKIE, { path: '/api' })
    return c.json({ ok: true })
  })

  // signed out is a normal answer here (200 with user null), not an error the browser logs
  app.get('/auth/me', (c) => {
    const token = getCookie(c, COOKIE)
    const row = token ? (q.sessionUser.get(sha256(token)) as (UserRow & { s_expires: number }) | undefined) : undefined
    if (!row || row.s_expires < now()) {
      if (token) deleteCookie(c, COOKIE, { path: '/api' })
      return c.json({ user: null })
    }
    return c.json({ user: publicUser(row) })
  })

  app.post('/auth/verify', smallBody, async (c) => {
    const body = await readJson(c)
    const token = typeof body?.token === 'string' ? body.token : ''
    const row = q.findToken.get(sha256(token), 'verify') as { user_id: number; expires_at: number; token_hash: string } | undefined
    if (!row || row.expires_at < now()) return fail(c, 400, 'token', 'Der Link ist ungültig oder abgelaufen. Fordere in deinem Konto einen neuen an.')
    q.verifyUser.run(now(), row.user_id)
    q.deleteToken.run(row.token_hash)
    return c.json({ ok: true })
  })

  app.post('/auth/resend-verification', requireUser, async (c) => {
    const user = c.get('user')
    if (user.email_verified_at) return c.json({ ok: true })
    if (!limits.resend.take(String(user.id))) return fail(c, 429, 'rate_limited', 'Bitte warte etwas, bevor du eine neue E-Mail anforderst.')
    await sendToken(user, 'verify')
    return c.json({ ok: true })
  })

  app.post('/auth/forgot', smallBody, async (c) => {
    const body = await readJson(c)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!limits.forgotIp.take(ip(c))) return fail(c, 429, 'rate_limited', 'Zu viele Anfragen. Versuch es später erneut.')
    const user = q.userByEmail.get(email) as UserRow | undefined
    // same answer whether or not the account exists
    if (user && limits.forgotEmail.take(email)) await sendToken(user, 'reset').catch((e) => console.error('reset mail failed', e))
    return c.json({ ok: true })
  })

  app.post('/auth/reset', smallBody, async (c) => {
    const body = await readJson(c)
    const token = typeof body?.token === 'string' ? body.token : ''
    const pwErr = passwordProblem(body?.password)
    if (pwErr) return fail(c, 400, 'password', pwErr)
    const row = q.findToken.get(sha256(token), 'reset') as { user_id: number; expires_at: number; token_hash: string } | undefined
    if (!row || row.expires_at < now()) return fail(c, 400, 'token', 'Der Link ist ungültig oder abgelaufen. Fordere einen neuen an.')
    q.setPassword.run(await hashPassword(body!.password as string), row.user_id)
    q.deleteToken.run(row.token_hash)
    q.deleteAllSessions.run(row.user_id)
    // the reset link proves access to the mailbox
    q.verifyUser.run(now(), row.user_id)
    const user = q.userById.get(row.user_id) as unknown as UserRow
    startSession(c, user.id)
    return c.json({ user: publicUser(user) })
  })

  app.post('/auth/change-password', smallBody, requireUser, async (c) => {
    const user = c.get('user')
    const body = await readJson(c)
    if (!(await verifyPassword(String(body?.current ?? ''), user.password_hash))) return fail(c, 403, 'credentials', 'Das aktuelle Passwort stimmt nicht.')
    const pwErr = passwordProblem(body?.next)
    if (pwErr) return fail(c, 400, 'password', pwErr)
    q.setPassword.run(await hashPassword(body!.next as string), user.id)
    q.deleteOtherSessions.run(user.id, c.get('sessionHash'))
    await mail({ to: user.email, ...passwordChangedMail() }).catch((e) => console.error('mail failed', e))
    return c.json({ ok: true })
  })

  app.get('/state', requireUser, (c) => {
    const row = q.getState.get(c.get('user').id) as { rev: number; data: string; updated_at: number } | undefined
    if (!row) return c.json({ rev: 0, data: null, updatedAt: null })
    return c.json({ rev: row.rev, data: JSON.parse(row.data), updatedAt: row.updated_at })
  })

  app.put(
    '/state',
    bodyLimit({ maxSize: MAX_STATE_BYTES, onError: (c) => fail(c, 413, 'too_large', 'Deine Daten überschreiten 5 MB.') }),
    requireUser,
    async (c) => {
      const body = await readJson(c)
      const rev = body?.rev
      const data = body?.data
      if (typeof rev !== 'number' || !Number.isInteger(rev) || rev < 0) return fail(c, 400, 'rev', 'Ungültige Revision.')
      if (!data || typeof data !== 'object' || Array.isArray(data) || (data as { v?: unknown }).v !== 1) return fail(c, 400, 'data', 'Ungültige Daten.')
      const userId = c.get('user').id
      const json = JSON.stringify(data)
      const t = now()
      // optimistic concurrency: the write only lands if nobody else wrote in between
      if (rev === 0) {
        if (q.getState.get(userId)) return conflict(c, userId)
        q.insertState.run(userId, json, t)
        return c.json({ rev: 1, updatedAt: t })
      }
      const res = q.updateState.run(json, t, userId, rev)
      if (res.changes === 0) return conflict(c, userId)
      return c.json({ rev: rev + 1, updatedAt: t })
    },
  )

  function conflict(c: Context, userId: number) {
    const row = q.getState.get(userId) as { rev: number; data: string; updated_at: number }
    return c.json({ error: 'conflict', rev: row.rev, data: JSON.parse(row.data), updatedAt: row.updated_at }, 409)
  }

  app.get('/account/export', requireUser, (c) => {
    const user = c.get('user')
    const row = q.getState.get(user.id) as { data: string; updated_at: number } | undefined
    c.header('Content-Disposition', 'attachment; filename="zyklus-export.json"')
    return c.json({ exportedAt: new Date(now()).toISOString(), account: publicUser(user), consentAt: new Date(user.consent_at).toISOString(), data: row ? JSON.parse(row.data) : null })
  })

  // POST with a JSON body: the password must not travel in a header that access logs record
  app.post('/account/delete', smallBody, requireUser, async (c) => {
    const user = c.get('user')
    const body = await readJson(c)
    if (!(await verifyPassword(String(body?.password ?? ''), user.password_hash))) return fail(c, 403, 'credentials', 'Das Passwort stimmt nicht.')
    q.deleteUser.run(user.id)
    deleteCookie(c, COOKIE, { path: '/api' })
    return c.json({ ok: true })
  })

  app.notFound((c) => fail(c, 404, 'not_found', 'Nicht gefunden.'))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'server', message: 'Serverfehler. Bitte versuch es später erneut.' }, 500)
  })

  return { app, sweep: () => Object.values(limits).forEach((l) => l.sweep()) }
}

/** Housekeeping: expired sessions and tokens, unverified accounts older than 7 days. */
export function cleanup(db: DB, now = Date.now()): { users: number } {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now)
  db.prepare('DELETE FROM tokens WHERE expires_at < ?').run(now)
  const res = db.prepare('DELETE FROM users WHERE email_verified_at IS NULL AND created_at < ?').run(now - VERIFY_TTL)
  return { users: Number(res.changes) }
}
