import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DATA_KEYS, emptyState, useStore, type State } from '../store'
import { api, ApiError, apiMessage, configureApi, type PublicUser } from './api'
import { tk } from '../i18n'
import { canon, merge, sameDoc as same, track, type SyncDoc } from './merge'

type Status = 'idle' | 'pending' | 'syncing' | 'ok' | 'offline' | 'error'

/**
 * The account the local data belongs to. `createdAt` tells a re-created account apart that got
 * the id of a deleted one (SQLite may reuse it); `origin` keeps apps on other hosts apart.
 */
export interface Owner {
  origin: string
  id: number
  createdAt: number
}

interface SyncState {
  /** Signed-in user (cached so the app opens offline). */
  user?: PublicUser
  /** The account the local data belongs to. */
  owner?: Owner
  /**
   * Legacy binding by id only. Still read once for the migration to `owner`, and still written,
   * so an older cached bundle running on this device keeps its own guard against mixing accounts.
   */
  ownerId?: number
  rev: number
  lastSyncedAt?: number
  status: Status
  error?: string
  /** /auth/me has answered (or failed) at least once this session. */
  checked: boolean
}

export const useSync = create<SyncState>()(
  persist((): SyncState => ({ rev: 0, status: 'idle', checked: false }), {
    name: 'zyklus-sync',
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ user: s.user, owner: s.owner, ownerId: s.ownerId, rev: s.rev, lastSyncedAt: s.lastSyncedAt }),
  }),
)

let applyingRemote = false
let pushTimer: number | undefined
let chain: Promise<void> = Promise.resolve()
/**
 * Bumped whenever the local data stops belonging to the account a running sync started for
 * (account change, logout, account deleted). A sync that finds it changed after an await drops
 * its result instead of writing another account's data into the store.
 */
let generation = 0

const ownerOf = (u: PublicUser): Owner => ({ origin: location.origin, id: u.id, createdAt: u.createdAt })
const sameOwner = (o: Owner | undefined, u: PublicUser) => !!o && o.origin === location.origin && o.id === u.id && o.createdAt === u.createdAt
/** Local data is synced only while it is bound to the signed-in account. */
function bound(): boolean {
  const s = useSync.getState()
  return !!s.user && sameOwner(s.owner, s.user)
}

configureApi({
  account: () => {
    const o = useSync.getState().owner
    return o ? `${o.id}:${o.createdAt}` : undefined
  },
  onAccountMismatch: () => recheckSession(),
})

let lastRecheck = -Infinity
/** The session belongs to another account (another tab signed in): find out whose it is and adopt it. */
function recheckSession() {
  // at most every few seconds, so a server that keeps disagreeing cannot start a request loop
  if (Date.now() - lastRecheck < 5000) return
  lastRecheck = Date.now()
  void checkSession()
}

/*
 * Local stash: when the data on this device cannot be shown to belong to the account that signs
 * in, it is kept here (latest only) before the device starts clean, and the settings offer to
 * restore it. Captured once, so every copy of the engine keeps using the storage it started with.
 */
const STASH = 'zyklus-stash'
export interface Stash {
  savedAt: number
  owner?: Owner
  doc: SyncDoc
}
const stashStorage: Storage | undefined = (() => {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
})()

export function readStash(): Stash | undefined {
  try {
    const v = JSON.parse(stashStorage?.getItem(STASH) ?? 'null') as Stash | null
    return v && typeof v === 'object' && typeof v.savedAt === 'number' && v.doc && typeof v.doc === 'object' && v.doc.state && typeof v.doc.state === 'object' ? v : undefined
  } catch {
    return undefined
  }
}

export function discardStash() {
  try {
    stashStorage?.removeItem(STASH)
  } catch {
    /* storage blocked */
  }
}

function writeStash(stash: Stash): boolean {
  try {
    if (!stashStorage) return false
    stashStorage.setItem(STASH, JSON.stringify(stash))
    return true
  } catch {
    return false
  }
}

const emptyDoc = (): SyncDoc => ({ v: 2, state: emptyState() as unknown as Record<string, unknown>, stamps: {}, tombstones: {} })
const EMPTY_STATE = canon(toDoc(emptyState()).state)
const hasData = (d: SyncDoc) => Object.keys(d.stamps).length > 0 || Object.keys(d.tombstones).length > 0 || canon(d.state) !== EMPTY_STATE

/**
 * Keep the local data in the stash, then start clean. The store is emptied first, which frees
 * the room in localStorage the stash needs. If it still cannot be written the data goes back
 * and the switch is refused: losing it silently is worse than not switching accounts.
 */
function stashAndClean(owner: Owner | undefined) {
  const doc = toDoc()
  applyDoc(emptyDoc())
  if (hasData(doc) && !writeStash({ savedAt: Date.now(), owner, doc })) {
    applyDoc(doc)
    throw new Error('stash_failed')
  }
  useSync.setState({ rev: 0, lastSyncedAt: undefined })
}

function toDoc(s: State = useStore.getState()): SyncDoc {
  const state: Record<string, unknown> = {}
  for (const k of DATA_KEYS) state[k] = s[k]
  return { v: 2, state, stamps: s.syncMeta.stamps, tombstones: s.syncMeta.tombstones }
}

function applyDoc(doc: SyncDoc) {
  const patch: Record<string, unknown> = { syncMeta: { stamps: doc.stamps, tombstones: doc.tombstones } }
  for (const k of DATA_KEYS) patch[k] = doc.state[k]
  applyingRemote = true
  try {
    useStore.setState(patch as Partial<State>)
  } finally {
    applyingRemote = false
  }
}

/** Serialise all network work so two syncs never interleave. */
function enqueue(fn: () => Promise<void>): Promise<void> {
  chain = chain.then(fn, fn)
  return chain
}

function handleError(e: unknown) {
  console.warn('[sync]', e)
  // another account's session: the session check api() started takes over from here
  if (e instanceof ApiError && e.code === 'account_mismatch') {
    useSync.setState({ status: 'idle' })
    return
  }
  if (e instanceof ApiError && e.status === 401) {
    useSync.setState({ user: undefined, status: 'idle' })
    return
  }
  const offline = e instanceof ApiError && e.status === 0
  useSync.setState({ status: offline ? 'offline' : 'error', error: apiMessage(e) })
}

/** Upload local data; on a conflict merge the server copy in and try again. */
async function pushNow(): Promise<void> {
  if (!bound()) return
  const gen = generation
  useSync.setState({ status: 'syncing' })
  let local = toDoc()
  let rev = useSync.getState().rev
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await api<{ rev: number }>('PUT', '/state', { rev, data: local })
      if (gen !== generation) return
      useSync.setState({ rev: res.rev, status: 'ok', lastSyncedAt: Date.now(), error: undefined })
      return
    } catch (e) {
      if (gen !== generation) return
      if (!(e instanceof ApiError && e.status === 409 && e.code === 'conflict')) return handleError(e)
      const remote = e.body.data as SyncDoc
      // rev 0: this device has never synced with the account (see pullNow)
      local = merge(toDoc(), remote, { preferRemote: rev === 0 })
      applyDoc(local)
      rev = Number(e.body.rev)
    }
  }
  useSync.setState({ status: 'error', error: tk('account.apiError.conflict') })
}

/** Fetch the server copy, merge it in, upload if this device had something new. */
async function pullNow(): Promise<void> {
  if (!bound()) return
  const gen = generation
  useSync.setState({ status: 'syncing' })
  try {
    const res = await api<{ rev: number; data: SyncDoc | null }>('GET', '/state')
    if (gen !== generation) return
    if (!res.data) {
      useSync.setState({ rev: 0 })
      return pushNow()
    }
    const local = toDoc()
    // First sync of this device with the account (rev 0): on equal zero stamps the account's
    // values win, so the defaults of a fresh device never replace values that were never stamped.
    const merged = merge(local, res.data, { preferRemote: useSync.getState().rev === 0 })
    if (!same(merged, local)) applyDoc(merged)
    useSync.setState({ rev: res.rev })
    if (!same(merged, res.data)) return pushNow()
    useSync.setState({ status: 'ok', lastSyncedAt: Date.now(), error: undefined })
  } catch (e) {
    if (gen !== generation) return
    handleError(e)
  }
}

export const syncNow = () => enqueue(pullNow)

function schedulePush() {
  if (!bound()) return
  window.clearTimeout(pushTimer)
  // never claim "synced" while a change is still waiting to go out
  useSync.setState({ status: 'pending' })
  pushTimer = window.setTimeout(() => enqueue(pushNow), 1500)
}

/** Record changes for merging and upload them shortly after. Call once at startup. */
export function startSync(): () => void {
  const unsub = useStore.subscribe((next, prev) => {
    if (applyingRemote) return
    const meta = track(prev as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, next.syncMeta, Date.now(), ['syncMeta'])
    if (!meta) return
    useStore.setState({ syncMeta: meta })
    schedulePush()
  })
  const onVisible = () => document.visibilityState === 'visible' && syncNow()
  const onOnline = () => syncNow()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  const interval = window.setInterval(() => document.visibilityState === 'visible' && syncNow(), 60_000)
  return () => {
    unsub()
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
    window.clearInterval(interval)
  }
}

/**
 * A user signed in on this device (or the session turned out to be theirs): decide whether the
 * local data is theirs, then bind it to the account and sync.
 *
 * - bound to this account: keep it
 * - bound to another account: stash it and start clean
 * - legacy binding by id only: the same account only if the device synced after the account was
 *   created (an account re-created with the same id is younger); then the binding is upgraded,
 *   otherwise it is ambiguous: stash and start clean
 * - not bound at all (used before signing in): the local data joins the account
 */
async function adopt(user: PublicUser) {
  const s = useSync.getState()
  if (!sameOwner(s.owner, user)) {
    const legacySame = !s.owner && s.ownerId === user.id && s.lastSyncedAt != null && s.lastSyncedAt >= user.createdAt
    const unbound = !s.owner && s.ownerId == null
    generation++
    window.clearTimeout(pushTimer)
    if (!legacySame && !unbound) stashAndClean(s.owner)
  }
  useSync.setState({ user, owner: ownerOf(user), ownerId: user.id })
  await syncNow()
}

export async function checkSession(): Promise<void> {
  try {
    const { user } = await api<{ user: PublicUser | null }>('GET', '/auth/me')
    if (user) await adopt(user)
    else useSync.setState({ user: undefined })
  } catch (e) {
    // offline: keep the cached user so the app still opens
    if (!(e instanceof ApiError && e.status === 0)) useSync.setState({ user: undefined })
  } finally {
    useSync.setState({ checked: true })
  }
}

export async function login(email: string, password: string) {
  const { user } = await api<{ user: PublicUser }>('POST', '/auth/login', { email, password })
  await adopt(user)
}

/**
 * Registration no longer signs in: the server answers the same whether or not the address is
 * taken, so there is nobody to adopt yet. The confirmation link does it (see verifyEmail).
 */
export async function register(email: string, password: string, consent: boolean, locale: string) {
  await api('POST', '/auth/register', { email, password, consent, locale })
}

/** Confirming the address signs the account in, so the user lands in the app straight away. */
export async function verifyEmail(token: string) {
  const { user } = await api<{ user: PublicUser }>('POST', '/auth/verify', { token })
  await adopt(user)
}

export async function resetPassword(token: string, password: string) {
  const { user } = await api<{ user: PublicUser }>('POST', '/auth/reset', { token, password })
  await adopt(user)
}

export async function refreshUser() {
  const { user } = await api<{ user: PublicUser | null }>('GET', '/auth/me')
  // the session may have changed hands in another tab: that goes through adopt
  if (user && !sameOwner(useSync.getState().owner, user)) return adopt(user)
  useSync.setState({ user: user ?? undefined })
}

/** Sign out; optionally wipe this device's copy (recommended on shared devices). */
export async function logout(clearDevice: boolean) {
  window.clearTimeout(pushTimer)
  await enqueue(pushNow).catch(() => undefined)
  await api('POST', '/auth/logout', {}).catch(() => undefined)
  generation++
  if (clearDevice) {
    applyDoc(emptyDoc())
    useSync.setState({ owner: undefined, ownerId: undefined, rev: 0 })
  }
  // otherwise the binding stays, so the same account signing in again keeps the data
  useSync.setState({ user: undefined, status: 'idle', lastSyncedAt: undefined })
}

/** Tell the server which language to use for e-mails (best effort, retried on next change). */
export async function setAccountLocale(locale: string) {
  if (!useSync.getState().user) return
  await api('POST', '/account/locale', { locale }).catch(() => undefined)
}

/** After the account was deleted on the server. */
export function forgetAccount() {
  generation++
  window.clearTimeout(pushTimer)
  applyDoc(emptyDoc())
  useSync.setState({ user: undefined, owner: undefined, ownerId: undefined, rev: 0, status: 'idle', lastSyncedAt: undefined })
}
