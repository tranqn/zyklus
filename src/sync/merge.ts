/**
 * Sync document merge: last-writer-wins per scalar and per collection item, with tombstones
 * so deletions survive a merge. Stamps are written locally whenever a value changes
 * (see tracker.ts); the server only stores documents and enforces revisions.
 */

/** Collections and the field that identifies an item. */
export const COLLECTIONS = {
  sessions: 'id',
  foods: 'id',
  cardio: 'id',
  mobility: 'id',
  checkIns: 'date',
  weights: 'date',
  measurements: 'date',
  recipes: 'id',
  supplements: 'id',
  customFoods: 'id',
  customExercises: 'id',
  pastMesos: 'id',
  mealPlan: 'id',
} as const

export type CollectionKey = keyof typeof COLLECTIONS
export type Stamps = Record<string, number>

export interface SyncDoc {
  v: 1
  state: Record<string, unknown>
  /** `s:<key>` for scalars, `i:<collection>:<id>` for items: last change time */
  stamps: Stamps
  /** `<collection>:<id>`: deletion time */
  tombstones: Stamps
}

type Item = Record<string, unknown>

export const isCollection = (k: string): k is CollectionKey => k in COLLECTIONS
export const itemId = (coll: CollectionKey, item: Item): string => String(item[COLLECTIONS[coll]])

const SORT: Partial<Record<CollectionKey, string>> = { sessions: 'startedAt', checkIns: 'date', weights: 'date', measurements: 'date' }

function mergeStamps(a: Stamps, b: Stamps): Stamps {
  const out: Stamps = { ...a }
  for (const [k, v] of Object.entries(b)) if (!(k in out) || v > out[k]) out[k] = v
  return out
}

/** Merge two documents. On equal stamps `local` wins, so merging is stable for the device. */
export function merge(local: SyncDoc, remote: SyncDoc): SyncDoc {
  const stamps = mergeStamps(local.stamps, remote.stamps)
  const tombstones = mergeStamps(local.tombstones, remote.tombstones)
  const state: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(local.state), ...Object.keys(remote.state)])

  for (const key of keys) {
    if (!isCollection(key)) {
      const ls = local.stamps[`s:${key}`] ?? 0
      const rs = remote.stamps[`s:${key}`] ?? 0
      // a cleared value (undefined, dropped by JSON) is a real value with its own stamp;
      // only a key the local side has never seen falls back to the remote one
      const useRemote = rs > ls || (ls === 0 && !(key in local.state))
      state[key] = useRemote ? remote.state[key] : local.state[key]
      continue
    }
    const la = (local.state[key] as Item[] | undefined) ?? []
    const ra = (remote.state[key] as Item[] | undefined) ?? []
    const remoteById = new Map(ra.map((it) => [itemId(key, it), it]))
    const seen = new Set<string>()
    const out: Item[] = []
    const pick = (id: string, l: Item | undefined, r: Item | undefined) => {
      if (seen.has(id)) return
      seen.add(id)
      const ls = local.stamps[`i:${key}:${id}`] ?? 0
      const rs = remote.stamps[`i:${key}:${id}`] ?? 0
      const winner = l && r ? (rs > ls ? r : l) : (l ?? r)!
      const born = Math.max(l ? ls : 0, r ? rs : 0)
      const dead = tombstones[`${key}:${id}`]
      if (dead != null && dead >= born) return
      out.push(winner)
    }
    for (const l of la) pick(itemId(key, l), l, remoteById.get(itemId(key, l)))
    for (const r of ra) pick(itemId(key, r), undefined, r)
    const by = SORT[key]
    if (by) out.sort((x, y) => String(x[by]).localeCompare(String(y[by])))
    state[key] = out
  }
  return { v: 1, state, stamps, tombstones }
}

/** Record which values changed between two states (called on every local store change). */
export function track(prev: Record<string, unknown>, next: Record<string, unknown>, meta: { stamps: Stamps; tombstones: Stamps }, now: number, skip: string[] = []): { stamps: Stamps; tombstones: Stamps } | null {
  let stamps: Stamps | null = null
  let tombstones: Stamps | null = null
  const stamp = (k: string) => ((stamps ??= { ...meta.stamps })[k] = now)
  for (const key of Object.keys(next)) {
    if (skip.includes(key) || typeof next[key] === 'function' || prev[key] === next[key]) continue
    if (!isCollection(key)) {
      stamp(`s:${key}`)
      continue
    }
    const before = new Map(((prev[key] as Item[]) ?? []).map((it) => [itemId(key, it), it]))
    const after = new Map(((next[key] as Item[]) ?? []).map((it) => [itemId(key, it), it]))
    for (const [id, it] of after) if (before.get(id) !== it) stamp(`i:${key}:${id}`)
    for (const id of before.keys()) if (!after.has(id)) (tombstones ??= { ...meta.tombstones })[`${key}:${id}`] = now
  }
  return stamps || tombstones ? { stamps: stamps ?? meta.stamps, tombstones: tombstones ?? meta.tombstones } : null
}
