import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DATA_KEYS, emptyState, parseBackup, useStore, type DataOwner, type State } from '../store'
import { api, ApiError, apiMessage, configureApi, LocalError, type PublicUser } from './api'
import { tk } from '../i18n'
import { canon, isCollection, itemId, merge, sameDoc as same, track, type SyncDoc } from './merge'
import { discardStash, putStashNow, rawStash, readStash, readStashes, removeStash, removeStashNow, stashKey, withStashLock, writeRawStash, type Stash } from './stash'
import { toast } from '../ui/notify'

type Status = 'idle' | 'pending' | 'syncing' | 'ok' | 'offline' | 'error'

/**
 * The account the local data belongs to: `useStore.owner`, stored with the data itself.
 * `createdAt` tells a re-created account apart that got the id of a deleted one (SQLite may reuse
 * it); `origin` keeps apps on other hosts apart.
 */
export type Owner = DataOwner

interface SyncState {
  /** Signed-in user (cached so the app opens offline). */
  user?: PublicUser
  /**
   * Legacy binding by id only. Still read once for the migration to `owner`, and still written,
   * so an older cached bundle running on this device keeps its own guard against mixing accounts.
   */
  ownerId?: number
  /** Legacy: the revision older versions kept here. Read once by adopt, now `useStore.rev`. */
  rev?: number
  lastSyncedAt?: number
  status: Status
  error?: string
  /** /auth/me has answered (or failed) at least once this session. */
  checked: boolean
}

export const useSync = create<SyncState>()(
  persist((): SyncState => ({ status: 'idle', checked: false }), {
    name: 'zyklus-sync',
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ user: s.user, ownerId: s.ownerId, rev: s.rev, lastSyncedAt: s.lastSyncedAt }),
  }),
)

let applyingRemote = false
let pushTimer: number | undefined
let chain: Promise<void> = Promise.resolve()
/**
 * Bumped on every sign-in (adopt), at the start and end of logout and when the account is deleted.
 * A sync or session check that finds it changed after an await drops its result instead of
 * writing another account's data into the store or adopting a session that is already over.
 */
let generation = 0

const ownerOf = (u: PublicUser): Owner => ({ origin: location.origin, id: u.id, createdAt: u.createdAt })
const sameOwner = (o: Owner | undefined, u: PublicUser) => !!o && o.origin === location.origin && o.id === u.id && o.createdAt === u.createdAt
/** The binding is read from the store: it is persisted in the same entry as the data. */
const dataOwner = () => useStore.getState().owner
/** Local data is synced only while it is bound to the signed-in account. */
function bound(): boolean {
  const user = useSync.getState().user
  return !!user && sameOwner(dataOwner(), user)
}
/** For account-scoped work outside the engine (friends): only once the binding is established. */
export const isBound = bound

/*
 * Set on the first binding and never cleared, in a key older bundles never write: from then on,
 * store data without an owner can only come from an older bundle still running in another tab
 * (it drops `owner` on every write), so it never takes the legacy path again.
 */
const MIGRATED = 'zyklus-bound'
const markerStorage: Storage | undefined = (() => {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
})()
function migrated(): boolean {
  try {
    return markerStorage?.getItem(MIGRATED) === '1'
  } catch {
    return false
  }
}
function markMigrated() {
  try {
    markerStorage?.setItem(MIGRATED, '1')
  } catch {
    /* storage blocked or full: the marker is set again on the next binding */
  }
}

type Binding = Partial<Pick<State, 'owner' | 'rev'>>
/** The server revision the local data was last merged with (stored with the data). */
const storeRev = () => useStore.getState().rev ?? 0

/** Change binding or revision without it counting as a change of the user's data. */
function setBinding(binding: Binding) {
  applyingRemote = true
  try {
    useStore.setState(binding)
  } finally {
    applyingRemote = false
  }
}

configureApi({
  account: () => {
    const o = dataOwner()
    return o ? `${o.id}:${o.createdAt}` : undefined
  },
  // signed out, requests simply get 401; signed in, only once the data is bound to the account
  ready: () => !useSync.getState().user || bound(),
  onAccountMismatch: () => recheckSession(),
})

let lastRecheck = -Infinity
/** Set while logout runs: its last upload may well hit another account's session. */
let loggingOut = false
/** The session belongs to another account (another tab signed in): find out whose it is and adopt it. */
function recheckSession() {
  if (loggingOut) return
  // at most every few seconds, so a server that keeps disagreeing cannot start a request loop
  if (Date.now() - lastRecheck < 5000) return
  lastRecheck = Date.now()
  void checkSession()
}

export { discardStash, readStash, readStashes, removeStash, stashKey, type Stash }

/**
 * Only a stash entry of the signed-in account may be restored: the same id and createdAt, or for
 * an entry of a legacy binding the same id. Other entries can only be discarded. Without an
 * argument: is there any entry the signed-in account may restore?
 */
export function canRestoreStash(stash?: Stash): boolean {
  if (!stash) return readStashes().some((s) => canRestoreStash(s))
  const user = useSync.getState().user
  if (!user || !bound()) return false
  if (stash.owner) return sameOwner(stash.owner, user)
  // an id-only entry may stem from a deleted account whose id was handed on: only when all of it
  // was written during this account's life is it this account's data
  return stash.ownerId === user.id && writtenSince(stash.doc, user.createdAt)
}

/** Every stamp and tombstone at or after `since`, and nothing that differs from a fresh state unstamped. */
function writtenSince(doc: SyncDoc, since: number): boolean {
  const stamps = Object.values(doc.stamps ?? {})
  const tombs = Object.values(doc.tombstones ?? {})
  if ([...stamps, ...tombs].some((t) => !(t >= since))) return false
  const fresh = emptyState() as unknown as Record<string, unknown>
  for (const [k, v] of Object.entries(doc.state)) {
    if (isCollection(k)) {
      for (const it of Array.isArray(v) ? (v as Record<string, unknown>[]) : []) if (!(doc.stamps[`i:${k}:${itemId(k, it)}`] >= since)) return false
    } else if (canon(v) !== canon(fresh[k]) && !(doc.stamps[`s:${k}`] >= since)) return false
  }
  return true
}

const isStamps = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number')

/**
 * Restore a backup file: it replaces the data (see importData), which validates everything
 * before it writes. If the restored data does not fit into localStorage, the previous data and
 * its stamps go back unchanged, and the answer says so instead of calling the file invalid.
 */
export function importBackup(json: string): 'ok' | 'invalid' | 'storage' {
  try {
    parseBackup(json)
  } catch {
    return 'invalid'
  }
  const before = toDoc()
  try {
    useStore.getState().importData(json)
  } catch {
    try {
      applyDoc(before)
    } catch {
      /* the previous data is still what localStorage holds */
    }
    return 'storage'
  }
  return 'ok'
}

/**
 * Bring the stash of the signed-in account back by merging it into the current data: stamps and
 * tombstones of both sides count, nothing the account has and the stash lacks is deleted. The
 * result is uploaded like any local change.
 *
 * The stash is removed before the merged data is written, so localStorage needs room for one
 * copy, not two. If even that fails, data and stash go back as they were.
 */
export async function recoverStash(key?: string): Promise<'ok' | 'none' | 'invalid' | 'storage'> {
  const result = await withStashLock(() => {
    const stash = readStashes().find((s) => (key ? stashKey(s) === key : canRestoreStash(s)))
    if (!stash || !canRestoreStash(stash)) return 'none'
    try {
      parseBackup(JSON.stringify(stash.doc.state))
    } catch {
      return 'invalid'
    }
    if (!isStamps(stash.doc.stamps) || !isStamps(stash.doc.tombstones)) return 'invalid'
    const before = toDoc()
    const merged = merge(before, stash.doc)
    const raw = rawStash()
    removeStashNow(stashKey(stash))
    try {
      applyDoc(merged)
    } catch {
      try {
        applyDoc(before)
      } catch {
        /* the previous data is still what localStorage holds */
      }
      if (raw) writeRawStash(raw)
      return 'storage'
    }
    return 'ok'
  })
  if (result === 'ok') schedulePush()
  return result
}

const emptyDoc = (): SyncDoc => ({ v: 2, state: emptyState() as unknown as Record<string, unknown>, stamps: {}, tombstones: {} })
const EMPTY_STATE = canon(toDoc(emptyState()).state)
const hasData = (d: SyncDoc) => Object.keys(d.stamps).length > 0 || Object.keys(d.tombstones).length > 0 || canon(d.state) !== EMPTY_STATE

/**
 * Keep the local data in the stash, then start clean for `incoming`, all in one synchronous step
 * under the stash lock. The store is emptied first, which frees the room in localStorage the
 * stash needs. If it still cannot be written the data goes back and the switch is refused:
 * losing it silently is worse than not switching accounts.
 */
async function stashAndClean(owner: Owner | undefined, ownerId: number | undefined, incoming: PublicUser) {
  const kept = await withStashLock(() => {
    // read now, not before waiting for the lock: the data may have changed meanwhile
    const doc = toDoc()
    const { rev, owner: previous } = useStore.getState()
    applyDoc(emptyDoc(), { rev: 0, owner: ownerOf(incoming) })
    // the entries of the account signing in survive, whatever else has to go
    const keep = [stashKey({ owner: ownerOf(incoming), savedAt: 0 }), stashKey({ ownerId: incoming.id, savedAt: 0 })]
    let ok: boolean
    try {
      ok = !hasData(doc) || putStashNow({ savedAt: Date.now(), owner, ownerId: owner ? undefined : ownerId, doc }, keep)
    } catch {
      // whatever went wrong, the data must not stay cleared
      ok = false
    }
    if (!ok) applyDoc(doc, { rev, owner: previous })
    return ok
  })
  if (!kept) throw new LocalError('switch_refused', 'Kontowechsel abgebrochen: nicht genug Speicher für die bisherigen Daten.')
  useSync.setState({ lastSyncedAt: undefined })
}

function toDoc(s: State = useStore.getState()): SyncDoc {
  const state: Record<string, unknown> = {}
  for (const k of DATA_KEYS) state[k] = s[k]
  return { v: 2, state, stamps: s.syncMeta.stamps, tombstones: s.syncMeta.tombstones }
}

/** Write a document into the store, with binding or revision in the same write (one localStorage entry). */
function applyDoc(doc: SyncDoc, binding: Binding = {}) {
  const patch: Record<string, unknown> = { syncMeta: { stamps: doc.stamps, tombstones: doc.tombstones }, ...binding }
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
  let rev = storeRev()
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await api<{ rev: number }>('PUT', '/state', { rev, data: local })
      if (gen !== generation) return
      setBinding({ rev: res.rev })
      useSync.setState({ status: 'ok', lastSyncedAt: Date.now(), error: undefined })
      return
    } catch (e) {
      if (gen !== generation) return
      if (!(e instanceof ApiError && e.status === 409 && e.code === 'conflict')) return handleError(e)
      const remote = e.body.data as SyncDoc | null
      if (!remote) {
        // the server has no document (any more): upload this copy as the first one
        local = toDoc()
        rev = 0
        continue
      }
      // rev 0: this device has never synced with the account (see pullNow)
      local = merge(toDoc(), remote, { preferRemote: rev === 0 })
      rev = Number(e.body.rev)
      applyDoc(local, { rev })
    }
  }
  useSync.setState({ status: 'error', error: tk('account.apiError.conflict') })
}

/** Fetch the server copy, merge it in, upload if this device had something new. */
async function pullNow(): Promise<void> {
  if (!bound()) {
    // A cached user without a matching binding (this version first opened offline, or data of
    // another account in the store): ask the server whose session it is, then adopt.
    if (useSync.getState().user) recheckSession()
    return
  }
  const gen = generation
  useSync.setState({ status: 'syncing' })
  try {
    const res = await api<{ rev: number; data: SyncDoc | null }>('GET', '/state')
    if (gen !== generation) return
    if (!res.data) {
      setBinding({ rev: 0 })
      return pushNow()
    }
    const local = toDoc()
    // First sync of this device with the account (rev 0): on equal zero stamps the account's
    // values win, so the defaults of a fresh device never replace values that were never stamped.
    const merged = merge(local, res.data, { preferRemote: storeRev() === 0 })
    // data and the revision it now includes go into the store in one write
    if (!same(merged, local)) applyDoc(merged, { rev: res.rev })
    else if (useStore.getState().rev !== res.rev) setBinding({ rev: res.rev })
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

/** Content of a document with collections in id order: tabs may hold the same items in another order. */
function sameContent(a: SyncDoc, b: SyncDoc): boolean {
  const byId = (d: SyncDoc) => ({
    ...d,
    state: Object.fromEntries(
      Object.entries(d.state).map(([k, v]) => [k, isCollection(k) && Array.isArray(v) ? [...(v as Record<string, unknown>[])].sort((x, y) => (itemId(k, x) < itemId(k, y) ? -1 : itemId(k, x) > itemId(k, y) ? 1 : 0)) : v]),
    ),
  })
  return canon(byId(a)) === canon(byId(b))
}

/**
 * Another tab of this browser wrote the store. Every tab persists its whole snapshot, so without
 * this the next write here (an edit, or just the ack of an upload, since rev lives in the store)
 * would drop that tab's newer edits, lost for good if the tab closed before uploading them. Same
 * account only: its data is merged in like a pull (no tracking, no upload of its own), keeping the
 * larger revision. Only a change of content is written back, so two tabs settle after one round.
 */
function mergeOtherTab(raw: string) {
  let incoming: Partial<State> | undefined
  try {
    incoming = (JSON.parse(raw) as { state?: Partial<State> }).state
  } catch {
    return
  }
  const owner = dataOwner()
  const theirs = incoming?.owner
  if (!incoming || !owner || !theirs || theirs.origin !== owner.origin || theirs.id !== owner.id || theirs.createdAt !== owner.createdAt) return
  const meta = incoming.syncMeta
  if (!meta || !isStamps(meta.stamps) || !isStamps(meta.tombstones)) return
  const state: Record<string, unknown> = {}
  for (const k of DATA_KEYS) if (k in incoming) state[k] = incoming[k]
  const local = toDoc()
  let merged: SyncDoc
  try {
    merged = merge(local, { v: 2, state, stamps: meta.stamps, tombstones: meta.tombstones })
  } catch {
    return
  }
  const rev = Math.max(storeRev(), typeof incoming.rev === 'number' ? incoming.rev : 0)
  if (!sameContent(merged, local)) applyDoc(merged, { rev })
  else if (rev !== storeRev()) setBinding({ rev })
}

/** Record changes for merging and upload them shortly after. Call once at startup. */
export function startSync(): () => void {
  const unsub = useStore.subscribe((next, prev) => {
    if (applyingRemote) return
    const meta = track(prev as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, next.syncMeta, Date.now(), ['syncMeta', 'owner'])
    if (!meta) return
    useStore.setState({ syncMeta: meta })
    schedulePush()
  })
  const onVisible = () => document.visibilityState === 'visible' && syncNow()
  const onOnline = () => syncNow()
  const storeKey = useStore.persist.getOptions().name
  const onStorage = (e: StorageEvent) => e.key === storeKey && e.newValue && mergeOtherTab(e.newValue)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('storage', onStorage)
  const interval = window.setInterval(() => document.visibilityState === 'visible' && syncNow(), 60_000)
  return () => {
    unsub()
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('storage', onStorage)
    window.clearInterval(interval)
  }
}

/**
 * A user signed in on this device (or the session turned out to be theirs): decide whether the
 * local data is theirs, then bind it to the account and sync.
 *
 * - bound to this account: keep it
 * - bound to another account: stash it and start clean
 * - legacy binding by id only: the same account only if the cached user matches in id and
 *   createdAt (an account re-created with the same id has another createdAt); then the binding is
 *   upgraded, otherwise it is ambiguous: stash and start clean
 * - not bound at all (used before signing in): the local data joins the account
 * - after the migration, data without an owner was written by an older bundle: identity unknown,
 *   so it is stashed (restorable by nobody) and the device starts clean
 */
async function adopt(user: PublicUser) {
  const s = useSync.getState()
  const owner = dataOwner()
  // every sign-in counts: a session check or sync started before it must not apply its answer
  const gen = ++generation
  if (!sameOwner(owner, user)) {
    // Legacy binding: the cached user was issued by the server together with ownerId, so its id
    // and createdAt prove the account (no device clock involved). Without it (an old logout that
    // kept the data) the case is ambiguous.
    const cached = s.user
    const legacy = !owner && !migrated()
    const legacySame = legacy && s.ownerId === user.id && !!cached && cached.id === user.id && cached.createdAt === user.createdAt
    const unbound = legacy && s.ownerId == null
    window.clearTimeout(pushTimer)
    // the identity of what gets stashed: the owner, or for a legacy binding the cached user that
    // came with it (id and createdAt); only without one is it known by id alone
    const identity = owner ?? (legacy && cached && cached.id === s.ownerId ? ownerOf(cached) : undefined)
    if (!legacySame && !unbound) {
      await stashAndClean(identity, legacy && !identity ? s.ownerId : undefined, user)
      // a later sign-in overtook this one while it waited for the stash lock: that one decides
      if (gen !== generation) return
    }
    // data kept from an older version: its revision is read once from zyklus-sync
    else if (useStore.getState().rev === undefined) setBinding({ rev: s.rev ?? 0 })
    setBinding({ owner: ownerOf(user) })
    markMigrated()
  }
  useSync.setState({ user, ownerId: user.id, rev: undefined })
  await syncNow()
}

export async function checkSession(): Promise<void> {
  // A login, logout or account switch while /auth/me is on its way decides instead: an answer
  // from before it (say, from the account_mismatch recheck) must not adopt anyone afterwards.
  const gen = generation
  try {
    let user: PublicUser | null
    try {
      ;({ user } = await api<{ user: PublicUser | null }>('GET', '/auth/me'))
    } catch (e) {
      if (gen !== generation) return
      // offline: keep the cached user so the app still opens
      if (!(e instanceof ApiError && e.status === 0)) useSync.setState({ user: undefined })
      return
    }
    if (gen !== generation) return
    if (!user) {
      useSync.setState({ user: undefined })
      return
    }
    try {
      await adopt(user)
    } catch (e) {
      // adopt itself failed (the switch was refused), which is not a superseded answer: the
      // session belongs to someone else now, so the cached user must not stay on screen
      useSync.setState({ user: undefined })
      toast(apiMessage(e))
    }
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
  if (user && !sameOwner(dataOwner(), user)) return adopt(user)
  useSync.setState({ user: user ?? undefined })
}

/** Sign out; optionally wipe this device's copy (recommended on shared devices). */
export async function logout(clearDevice: boolean) {
  loggingOut = true
  // a session check still on its way must not adopt anyone from here on
  generation++
  try {
    window.clearTimeout(pushTimer)
    await enqueue(pushNow).catch(() => undefined)
    await api('POST', '/auth/logout', {}).catch(() => undefined)
    generation++
    if (clearDevice) {
      applyDoc(emptyDoc(), { owner: undefined, rev: 0 })
      discardStash()
      useSync.setState({ ownerId: undefined })
    }
    // otherwise the binding stays, so the same account signing in again keeps the data
    useSync.setState({ user: undefined, status: 'idle', lastSyncedAt: undefined })
  } finally {
    loggingOut = false
  }
}

/** Tell the server which language to use for e-mails (best effort, retried on next change). */
export async function setAccountLocale(locale: string) {
  if (!bound()) return
  await api('POST', '/account/locale', { locale }).catch(() => undefined)
}

/** After the account was deleted on the server. */
export function forgetAccount() {
  generation++
  window.clearTimeout(pushTimer)
  applyDoc(emptyDoc(), { owner: undefined, rev: 0 })
  discardStash()
  useSync.setState({ user: undefined, ownerId: undefined, status: 'idle', lastSyncedAt: undefined })
}
