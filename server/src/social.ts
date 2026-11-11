import { randomBytes } from 'node:crypto'
import type { Context, Hono, MiddlewareHandler, Next } from 'hono'
import type { DB, UserRow } from './db.ts'
import { RateLimiter } from './ratelimit.ts'
import { ACHIEVEMENTS, achievementLevel, activityLog, computeFlames, dayNum, dayStr, isActive, pausedDays, type ActivityLog, type WeeklyGoal } from './shared/flames.ts'

/**
 * Friends and challenges. Friends see a summary only: name, flames, this week and achievement
 * levels, never workouts, food or body data. The summary is derived from the synced state on
 * every upload, so the app needs no extra call.
 */

export const MAX_FRIENDS = 50
export const MAX_MEMBERS = 10
/** Caps on a summary: it is replayed for every friend and challenge member, so its size is not the owner's to decide. */
const MAX_FROZEN = 2000
const MAX_GOALS = 200
const CHALLENGE_DAYS = [7, 14, 30]
const METRICS = ['active_days', 'minutes'] as const
type Metric = (typeof METRICS)[number]
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
// no 0/O, 1/I/L: codes are typed in by hand
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export interface Summary {
  log: ActivityLog
  frozen: string[]
  mode?: string
  modeSince?: string
  goals?: WeeklyGoal[]
  defaultGoal: number
}

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {})
const list = (v: unknown): Rec[] => (Array.isArray(v) ? v.map(rec).filter((x) => typeof x.date === 'string' && DATE_RE.test(x.date)) : [])
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Name and activity summary from a synced document ({ v, state, stamps, tombstones }). */
export function summarize(doc: unknown): { name: string; summary: Summary } {
  const state = rec(rec(doc).state)
  const settings = rec(state.settings)
  const profile = rec(state.profile)
  const log = activityLog({
    sessions: list(state.sessions) as never,
    cardio: list(state.cardio).map((c) => ({ date: String(c.date), minutes: Number(c.minutes) || 0 })),
    mobility: list(state.mobility).map((m) => ({ date: String(m.date), minutes: Number(m.minutes) || 0 })),
  })
  const goals = Array.isArray(settings.weeklyGoals)
    ? settings.weeklyGoals.map(rec).filter((g) => typeof g.from === 'string' && DATE_RE.test(g.from) && typeof g.days === 'number').map((g) => ({ from: String(g.from), days: Number(g.days) })).slice(0, MAX_GOALS)
    : undefined
  const days = Number(profile.daysPerWeek)
  return {
    name: str(profile.name, 40),
    summary: {
      log,
      frozen: Array.isArray(state.frozenDays) ? state.frozenDays.filter((d): d is string => typeof d === 'string' && DATE_RE.test(d)).slice(0, MAX_FROZEN) : [],
      mode: str(settings.mode, 20) || undefined,
      // a date here drives a day loop in pausedDays, so it has to be a date
      modeSince: typeof settings.modeSince === 'string' && DATE_RE.test(settings.modeSince) ? settings.modeSince : undefined,
      goals,
      defaultGoal: Number.isFinite(days) && days > 0 ? Math.min(7, days) : 3,
    },
  }
}

export function newCode(len = 8): string {
  // rejection sampling: 256 is not a multiple of 31, so `% length` would favour the first symbols
  const max = Math.floor(256 / ALPHABET.length) * ALPHABET.length
  let out = ''
  while (out.length < len) for (const b of randomBytes(len)) if (b < max && out.length < len) out += ALPHABET[b % ALPHABET.length]
  return out
}
const normCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)

type Vars = { Variables: { user: UserRow; sessionHash: string } }
type Fail = (c: Context, status: 400 | 403 | 404 | 409 | 429, error: string, message: string) => Response
interface Helpers {
  db: DB
  now: () => number
  requireUser: (c: Context<Vars>, next: Next) => Promise<Response | void>
  fail: Fail
  readJson: (c: Context) => Promise<Rec | null>
  /** 16 KB cap; without it these routes would read a body of any size before looking at it */
  smallBody: MiddlewareHandler
}

export function createSocial({ db, now, requireUser, fail, readJson, smallBody }: Helpers) {
  const limit = new RateLimiter(30, 15 * 60 * 1000, now)
  const q = {
    getSummary: db.prepare('SELECT name, data FROM summaries WHERE user_id = ?'),
    putSummary: db.prepare('INSERT INTO summaries (user_id, name, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at'),
    getState: db.prepare('SELECT data FROM states WHERE user_id = ?'),
    inviteOf: db.prepare('SELECT code FROM invites WHERE user_id = ?'),
    inviteByCode: db.prepare('SELECT user_id FROM invites WHERE code = ?'),
    putInvite: db.prepare('INSERT INTO invites (user_id, code, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at'),
    friendIds: db.prepare('SELECT CASE WHEN a = ? THEN b ELSE a END AS id, created_at FROM friendships WHERE a = ? OR b = ? ORDER BY created_at'),
    isFriend: db.prepare('SELECT 1 FROM friendships WHERE a = ? AND b = ?'),
    addFriend: db.prepare('INSERT OR IGNORE INTO friendships (a, b, created_at) VALUES (?, ?, ?)'),
    removeFriend: db.prepare('DELETE FROM friendships WHERE a = ? AND b = ?'),
    insertChallenge: db.prepare('INSERT INTO challenges (id, owner_id, kind, title, metric, target, days, start_date, end_date, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    challenge: db.prepare('SELECT * FROM challenges WHERE id = ?'),
    challengeByCode: db.prepare('SELECT * FROM challenges WHERE code = ?'),
    myChallenges: db.prepare('SELECT c.* FROM challenges c JOIN challenge_members m ON m.challenge_id = c.id WHERE m.user_id = ? ORDER BY c.start_date DESC'),
    members: db.prepare('SELECT user_id, joined_at FROM challenge_members WHERE challenge_id = ? ORDER BY joined_at'),
    isMember: db.prepare('SELECT 1 FROM challenge_members WHERE challenge_id = ? AND user_id = ?'),
    addMember: db.prepare('INSERT OR IGNORE INTO challenge_members (challenge_id, user_id, joined_at) VALUES (?, ?, ?)'),
    removeMember: db.prepare('DELETE FROM challenge_members WHERE challenge_id = ? AND user_id = ?'),
    deleteChallenge: db.prepare('DELETE FROM challenges WHERE id = ?'),
  }

  const pair = (x: number, y: number): [number, number] => (x < y ? [x, y] : [y, x])
  const friendsOf = (id: number) => (q.friendIds.all(id, id, id) as { id: number; created_at: number }[])
  const areFriends = (x: number, y: number) => !!q.isFriend.get(...pair(x, y))

  /** Store the summary of an uploaded document; a broken document must never fail the upload. */
  function saveSummary(userId: number, doc: unknown) {
    try {
      const { name, summary } = summarize(doc)
      q.putSummary.run(userId, name, JSON.stringify(summary), now())
    } catch (e) {
      console.error('[social] summary', e)
    }
  }

  function summaryOf(userId: number): { name: string; summary: Summary } {
    const row = q.getSummary.get(userId) as { name: string; data: string } | undefined
    if (row) return { name: row.name, summary: JSON.parse(row.data) as Summary }
    // accounts that synced before summaries existed
    const state = q.getState.get(userId) as { data: string } | undefined
    const built = summarize(state ? JSON.parse(state.data) : {})
    if (state) q.putSummary.run(userId, built.name, JSON.stringify(built.summary), now())
    return built
  }

  /** The client's calendar day (its time zone decides when a day ends), within two days of the server's. */
  function dayParam(c: Context): string {
    const d = c.req.query('today') ?? ''
    const server = dayStr(Math.floor(now() / 86_400_000))
    return DATE_RE.test(d) && Math.abs(dayNum(d) - dayNum(server)) <= 2 ? d : server
  }

  function profileView(userId: number, today: string) {
    const { name, summary: s } = summaryOf(userId)
    const f = computeFlames(s.log, { today, paused: pausedDays(s.frozen, s.mode, s.modeSince, today), goals: s.goals, defaultGoal: s.defaultGoal })
    const levels = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, achievementLevel(a.id, f.progress[a.id]).level]))
    return {
      id: userId,
      name,
      daily: { count: f.daily.count, best: f.daily.best, activeToday: f.daily.activeToday, atRisk: f.daily.atRisk, paused: f.daily.pausedToday },
      weekly: { count: f.weekly.count, best: f.weekly.best, ...f.weekly.thisWeek },
      levels,
    }
  }

  // ---- challenges ----

  interface ChallengeRow {
    id: string
    owner_id: number
    kind: 'goal' | 'streak'
    title: string
    metric: Metric | null
    target: number | null
    days: number
    start_date: string
    end_date: string
    code: string
    created_at: number
  }

  /** Progress of a challenge on `today`: the group total for a goal, each member's run for a streak. */
  function challengeView(ch: ChallengeRow, today: string, viewer: number) {
    const members = q.members.all(ch.id) as { user_id: number; joined_at: number }[]
    const start = dayNum(ch.start_date)
    const end = dayNum(ch.end_date)
    const t = dayNum(today)
    const last = Math.min(end, t)
    const finished = t > end
    const rows = members.map((m) => {
      const { name, summary: s } = summaryOf(m.user_id)
      const paused = new Set(pausedDays(s.frozen, s.mode, s.modeSince, today))
      let value = 0
      let ok = true
      for (let d = start; d <= last; d++) {
        const day = dayStr(d)
        const a = s.log[day]
        if (ch.kind === 'goal') value += ch.metric === 'minutes' ? (a?.minutes ?? 0) : isActive(a) ? 1 : 0
        else if (isActive(a)) value++
        else if (!paused.has(day) && d < t) ok = false
      }
      // a streak is done once the last day is active (or over); today may still be open
      const status = ch.kind === 'goal' ? undefined : !ok ? 'out' : finished || (t === end && (isActive(s.log[ch.end_date]) || paused.has(ch.end_date))) ? 'done' : 'running'
      return { id: m.user_id, name, value, status, me: m.user_id === viewer }
    })
    const total = rows.reduce((a, r) => a + r.value, 0)
    const status =
      ch.kind === 'goal'
        ? total >= (ch.target ?? 0) ? 'done' : finished ? 'failed' : 'running'
        : finished || rows.every((r) => r.status !== 'running') ? 'over' : 'running'
    return {
      id: ch.id,
      kind: ch.kind,
      title: ch.title,
      metric: ch.metric,
      target: ch.target,
      days: ch.days,
      start: ch.start_date,
      end: ch.end_date,
      code: ch.code,
      owner: ch.owner_id === viewer,
      status,
      total,
      members: rows,
    }
  }

  /** Finished challenges for the achievements: reached group goals and completed streaks. */
  function challengeCounts(userId: number, today: string) {
    let team = 0
    let grit = 0
    for (const ch of q.myChallenges.all(userId) as unknown as ChallengeRow[]) {
      const v = challengeView(ch, today, userId)
      if (ch.kind === 'goal' && v.status === 'done') team++
      if (ch.kind === 'streak' && v.members.find((m) => m.me)?.status === 'done') grit++
    }
    return { team, grit }
  }

  /** Read-only: a GET must not create anything. The app asks /social/invite/rotate for a first code. */
  function currentCode(userId: number): string | null {
    return (q.inviteOf.get(userId) as { code: string } | undefined)?.code ?? null
  }

  function mount(app: Hono<Vars>) {
    const throttled = (c: Context) => !limit.take(c.req.header('x-forwarded-for')?.split(',').pop()?.trim() || 'local')

    app.get('/social/me', requireUser, (c) => {
      const me = c.get('user').id
      const today = dayParam(c)
      return c.json({ name: summaryOf(me).name, code: currentCode(me), counts: { friends: friendsOf(me).length, ...challengeCounts(me, today) } })
    })

    app.post('/social/invite/rotate', smallBody, requireUser, (c) => {
      const code = newCode()
      q.putInvite.run(c.get('user').id, code, now())
      return c.json({ code })
    })

    app.get('/social/invite/:code', requireUser, (c) => {
      if (throttled(c)) return fail(c, 429, 'rate', 'Zu viele Versuche. Bitte warte ein paar Minuten.')
      const row = q.inviteByCode.get(normCode((c.req.param('code') ?? ''))) as { user_id: number } | undefined
      if (!row) return fail(c, 404, 'invite_unknown', 'Diese Einladung gibt es nicht (mehr).')
      const me = c.get('user').id
      return c.json({ name: summaryOf(row.user_id).name, self: row.user_id === me, friends: areFriends(me, row.user_id) })
    })

    app.post('/social/invite/:code/accept', smallBody, requireUser, (c) => {
      if (throttled(c)) return fail(c, 429, 'rate', 'Zu viele Versuche. Bitte warte ein paar Minuten.')
      const row = q.inviteByCode.get(normCode((c.req.param('code') ?? ''))) as { user_id: number } | undefined
      if (!row) return fail(c, 404, 'invite_unknown', 'Diese Einladung gibt es nicht (mehr).')
      const me = c.get('user').id
      if (row.user_id === me) return fail(c, 400, 'invite_self', 'Das ist deine eigene Einladung.')
      if (!areFriends(me, row.user_id) && (friendsOf(me).length >= MAX_FRIENDS || friendsOf(row.user_id).length >= MAX_FRIENDS)) {
        return fail(c, 409, 'friend_limit', 'Mehr als 50 Freunde gehen nicht.')
      }
      q.addFriend.run(...pair(me, row.user_id), now())
      return c.json({ friend: profileView(row.user_id, dayParam(c)) })
    })

    app.get('/social/friends', requireUser, (c) => {
      const today = dayParam(c)
      return c.json({ friends: friendsOf(c.get('user').id).map((f) => ({ ...profileView(f.id, today), since: f.created_at })) })
    })

    app.post('/social/friends/:id/remove', smallBody, requireUser, (c) => {
      const other = Number((c.req.param('id') ?? ''))
      if (!Number.isInteger(other)) return fail(c, 404, 'not_found', 'Nicht gefunden.')
      q.removeFriend.run(...pair(c.get('user').id, other))
      return c.json({ ok: true })
    })

    app.get('/social/challenges', requireUser, (c) => {
      const me = c.get('user').id
      const today = dayParam(c)
      return c.json({ challenges: (q.myChallenges.all(me) as unknown as ChallengeRow[]).map((ch) => challengeView(ch, today, me)) })
    })

    app.post('/social/challenges', smallBody, requireUser, async (c) => {
      if (throttled(c)) return fail(c, 429, 'rate', 'Zu viele Versuche. Bitte warte ein paar Minuten.')
      const me = c.get('user').id
      const body = rec(await readJson(c))
      const kind = body.kind === 'streak' ? 'streak' : body.kind === 'goal' ? 'goal' : null
      const days = Number(body.days)
      if (!kind || !CHALLENGE_DAYS.includes(days)) return fail(c, 400, 'challenge_invalid', 'Ungültige Challenge.')
      const metric: Metric | null = kind === 'goal' ? (METRICS.includes(body.metric as Metric) ? (body.metric as Metric) : null) : null
      const target = kind === 'goal' ? Math.round(Number(body.target)) : null
      if (kind === 'goal' && (!metric || !target || target < 1 || target > (metric === 'minutes' ? 100_000 : 1_000))) return fail(c, 400, 'challenge_invalid', 'Ungültige Challenge.')
      const start = dayParam(c)
      const id = randomBytes(9).toString('base64url')
      q.insertChallenge.run(id, me, kind, str(body.title, 60), metric, target, days, start, dayStr(dayNum(start) + days - 1), newCode(), now())
      q.addMember.run(id, me, now())
      // slice first: areFriends is a synchronous query, so filtering the whole array would be one DB round per element
      const invite = (Array.isArray(body.invite) ? body.invite : []).slice(0, MAX_MEMBERS - 1).map(Number).filter((f) => Number.isInteger(f) && areFriends(me, f))
      for (const f of invite) q.addMember.run(id, f, now())
      return c.json({ challenge: challengeView(q.challenge.get(id) as unknown as ChallengeRow, start, me) }, 201)
    })

    app.get('/social/challenges/join/:code', requireUser, (c) => {
      if (throttled(c)) return fail(c, 429, 'rate', 'Zu viele Versuche. Bitte warte ein paar Minuten.')
      const ch = q.challengeByCode.get(normCode((c.req.param('code') ?? ''))) as unknown as ChallengeRow | undefined
      if (!ch) return fail(c, 404, 'challenge_unknown', 'Diese Challenge gibt es nicht (mehr).')
      return c.json({ challenge: challengeView(ch, dayParam(c), c.get('user').id) })
    })

    app.post('/social/challenges/join/:code', smallBody, requireUser, (c) => {
      if (throttled(c)) return fail(c, 429, 'rate', 'Zu viele Versuche. Bitte warte ein paar Minuten.')
      const ch = q.challengeByCode.get(normCode((c.req.param('code') ?? ''))) as unknown as ChallengeRow | undefined
      if (!ch) return fail(c, 404, 'challenge_unknown', 'Diese Challenge gibt es nicht (mehr).')
      const me = c.get('user').id
      const today = dayParam(c)
      if (!q.isMember.get(ch.id, me)) {
        if (dayNum(today) > dayNum(ch.end_date)) return fail(c, 409, 'challenge_over', 'Diese Challenge ist schon vorbei.')
        if (q.members.all(ch.id).length >= MAX_MEMBERS) return fail(c, 409, 'challenge_full', 'Die Challenge ist voll.')
        q.addMember.run(ch.id, me, now())
      }
      return c.json({ challenge: challengeView(ch, today, me) })
    })

    app.get('/social/challenges/:id', requireUser, (c) => {
      const me = c.get('user').id
      const ch = q.challenge.get((c.req.param('id') ?? '')) as unknown as ChallengeRow | undefined
      if (!ch || !q.isMember.get(ch.id, me)) return fail(c, 404, 'not_found', 'Nicht gefunden.')
      return c.json({ challenge: challengeView(ch, dayParam(c), me) })
    })

    app.post('/social/challenges/:id/invite', smallBody, requireUser, async (c) => {
      const me = c.get('user').id
      const ch = q.challenge.get((c.req.param('id') ?? '')) as unknown as ChallengeRow | undefined
      if (!ch || !q.isMember.get(ch.id, me)) return fail(c, 404, 'not_found', 'Nicht gefunden.')
      const ids = rec(await readJson(c)).ids
      const room = Math.max(0, MAX_MEMBERS - q.members.all(ch.id).length)
      const add = (Array.isArray(ids) ? ids : []).slice(0, room).map(Number).filter((f) => Number.isInteger(f) && areFriends(me, f))
      for (const f of add) q.addMember.run(ch.id, f, now())
      return c.json({ challenge: challengeView(ch, dayParam(c), me) })
    })

    app.post('/social/challenges/:id/leave', smallBody, requireUser, (c) => {
      const me = c.get('user').id
      const id = (c.req.param('id') ?? '')
      if (!q.isMember.get(id, me)) return fail(c, 404, 'not_found', 'Nicht gefunden.')
      q.removeMember.run(id, me)
      if (!q.members.all(id).length) q.deleteChallenge.run(id)
      return c.json({ ok: true })
    })
  }

  /** What the export contains about friends and challenges. */
  function exportFor(userId: number) {
    const today = dayStr(Math.floor(now() / 86_400_000))
    return {
      inviteCode: (q.inviteOf.get(userId) as { code: string } | undefined)?.code ?? null,
      friends: friendsOf(userId).map((f) => ({ name: summaryOf(f.id).name, since: new Date(f.created_at).toISOString() })),
      challenges: (q.myChallenges.all(userId) as unknown as ChallengeRow[]).map((ch) => {
        const v = challengeView(ch, today, userId)
        return { title: v.title, kind: v.kind, start: v.start, end: v.end, status: v.status }
      }),
    }
  }

  return { mount, saveSummary, exportFor }
}
