import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DATA_KEYS, emptyState, useStore, type State } from '../store'
import { api, ApiError, type PublicUser } from './api'
import { merge, track, type SyncDoc } from './merge'

type Status = 'idle' | 'pending' | 'syncing' | 'ok' | 'offline' | 'error'

interface SyncState {
  /** Signed-in user (cached so the app opens offline). */
  user?: PublicUser
  /** The user the local data belongs to. */
  ownerId?: number
  rev: number
  lastSyncedAt?: number
  status: Status
  error?: string
  /** Chose "use without account" on this device. */
  localOnly: boolean
  /** /auth/me has answered (or failed) at least once this session. */
  checked: boolean
}

export const useSync = create<SyncState>()(
  persist((): SyncState => ({ rev: 0, status: 'idle', localOnly: false, checked: false }), {
    name: 'zyklus-sync',
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ user: s.user, ownerId: s.ownerId, rev: s.rev, lastSyncedAt: s.lastSyncedAt, localOnly: s.localOnly }),
  }),
)

let applyingRemote = false
let pushTimer: number | undefined
let chain: Promise<void> = Promise.resolve()

function toDoc(s: State = useStore.getState()): SyncDoc {
  const state: Record<string, unknown> = {}
  for (const k of DATA_KEYS) state[k] = s[k]
  return { v: 1, state, stamps: s.syncMeta.stamps, tombstones: s.syncMeta.tombstones }
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

const same = (a: SyncDoc, b: SyncDoc) => JSON.stringify(a) === JSON.stringify(b)

/** Serialise all network work so two syncs never interleave. */
function enqueue(fn: () => Promise<void>): Promise<void> {
  chain = chain.then(fn, fn)
  return chain
}

function handleError(e: unknown) {
  console.warn('[sync]', e)
  if (e instanceof ApiError && e.status === 401) {
    useSync.setState({ user: undefined, status: 'idle' })
    return
  }
  const offline = e instanceof ApiError && e.status === 0
  useSync.setState({ status: offline ? 'offline' : 'error', error: e instanceof Error ? e.message : String(e) })
}

/** Upload local data; on a conflict merge the server copy in and try again. */
async function pushNow(): Promise<void> {
  if (!useSync.getState().user) return
  useSync.setState({ status: 'syncing' })
  let local = toDoc()
  let rev = useSync.getState().rev
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await api<{ rev: number }>('PUT', '/state', { rev, data: local })
      useSync.setState({ rev: res.rev, status: 'ok', lastSyncedAt: Date.now(), error: undefined })
      return
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409)) return handleError(e)
      const remote = e.body.data as SyncDoc
      local = merge(toDoc(), remote)
      applyDoc(local)
      rev = Number(e.body.rev)
    }
  }
  useSync.setState({ status: 'error', error: 'Synchronisierung kollidiert wiederholt. Versuch es gleich nochmal.' })
}

/** Fetch the server copy, merge it in, upload if this device had something new. */
async function pullNow(): Promise<void> {
  if (!useSync.getState().user) return
  useSync.setState({ status: 'syncing' })
  try {
    const res = await api<{ rev: number; data: SyncDoc | null }>('GET', '/state')
    if (!res.data) {
      useSync.setState({ rev: 0 })
      return pushNow()
    }
    const local = toDoc()
    const merged = merge(local, res.data)
    if (!same(merged, local)) applyDoc(merged)
    useSync.setState({ rev: res.rev })
    if (!same(merged, res.data)) return pushNow()
    useSync.setState({ status: 'ok', lastSyncedAt: Date.now(), error: undefined })
  } catch (e) {
    handleError(e)
  }
}

export const syncNow = () => enqueue(pullNow)

function schedulePush() {
  if (!useSync.getState().user) return
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

/** A user signed in on this device: adopt or merge local data, then sync. */
async function adopt(user: PublicUser) {
  const s = useSync.getState()
  if (s.ownerId != null && s.ownerId !== user.id) {
    // local data belongs to someone else's account: start clean for this one
    applyDoc({ v: 1, state: emptyState() as unknown as Record<string, unknown>, stamps: {}, tombstones: {} })
    useSync.setState({ rev: 0 })
  }
  useSync.setState({ user, ownerId: user.id, localOnly: false })
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

export async function register(email: string, password: string, consent: boolean) {
  const { user } = await api<{ user: PublicUser }>('POST', '/auth/register', { email, password, consent })
  await adopt(user)
}

export async function resetPassword(token: string, password: string) {
  const { user } = await api<{ user: PublicUser }>('POST', '/auth/reset', { token, password })
  await adopt(user)
}

export async function refreshUser() {
  const { user } = await api<{ user: PublicUser | null }>('GET', '/auth/me')
  useSync.setState({ user: user ?? undefined })
}

/** Sign out; optionally wipe this device's copy (recommended on shared devices). */
export async function logout(clearDevice: boolean) {
  window.clearTimeout(pushTimer)
  await enqueue(pushNow).catch(() => undefined)
  await api('POST', '/auth/logout', {}).catch(() => undefined)
  if (clearDevice) {
    applyDoc({ v: 1, state: emptyState() as unknown as Record<string, unknown>, stamps: {}, tombstones: {} })
    useSync.setState({ ownerId: undefined, rev: 0 })
  }
  useSync.setState({ user: undefined, status: 'idle', lastSyncedAt: undefined })
}

/** After the account was deleted on the server. */
export function forgetAccount() {
  applyDoc({ v: 1, state: emptyState() as unknown as Record<string, unknown>, stamps: {}, tombstones: {} })
  useSync.setState({ user: undefined, ownerId: undefined, rev: 0, status: 'idle', lastSyncedAt: undefined })
}
