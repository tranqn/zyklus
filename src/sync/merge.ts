/**
 * Sync document merge: last-writer-wins per scalar and per collection item, with tombstones
 * so deletions survive a merge. Stamps are written locally whenever a value changes
 * (see track below); the server only stores documents and enforces revisions.
 *
 * The result must not depend on which side is local: every device has to compute the same
 * document from the same two inputs, or two devices upload their own variant in turn forever.
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
  /**
   * 1: written by bundles without account binding. 2: written with the account binding; once the
   * server holds a version 2 document it refuses version 1 uploads (426 client_outdated).
   */
  v: 1 | 2
  state: Record<string, unknown>
  /** `s:<key>` for scalars, `i:<collection>:<id>` for items: last change time */
  stamps: Stamps
  /** `<collection>:<id>`: deletion time */
  tombstones: Stamps
}

type Item = Record<string, unknown>

/**
 * Canonical JSON: object keys sorted (by UTF-16 code units, as Array.prototype.sort does),
 * undefined members dropped and undefined array slots written as null, like JSON.stringify.
 * The same content gives the same string on every device, whatever the key order.
 */
export function canon(v: unknown): string | undefined {
  if (v === undefined || typeof v === 'function') return undefined
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map((x) => canon(x) ?? 'null').join(',')}]`
  const parts: string[] = []
  for (const k of Object.keys(v).sort()) {
    const c = canon((v as Record<string, unknown>)[k])
    if (c !== undefined) parts.push(`${JSON.stringify(k)}:${c}`)
  }
  return `{${parts.join(',')}}`
}

export const isCollection = (k: string): k is CollectionKey => k in COLLECTIONS
export const itemId = (coll: CollectionKey, item: Item): string => String(item[COLLECTIONS[coll]])

const SORT: Partial<Record<CollectionKey, string>> = { sessions: 'startedAt', checkIns: 'date', weights: 'date', measurements: 'date' }

/** Plain code-unit order: the same on every device and in every language, unlike localeCompare. */
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function mergeStamps(a: Stamps, b: Stamps): Stamps {
  const out: Stamps = { ...a }
  for (const [k, v] of Object.entries(b)) if (!(k in out) || v > out[k]) out[k] = v
  return out
}

export interface MergeOptions {
  /**
   * First sync of this device with the account: on equal zero stamps the account's value wins,
   * so the defaults of a fresh device never replace values that were simply never stamped.
   */
  preferRemote?: boolean
}

/**
 * Does the remote value win? The higher stamp wins. Equal stamps are broken canonically: a defined
 * value beats undefined, otherwise the larger canonical JSON wins (string comparison by UTF-16
 * code units). Equal zero stamps go to the remote side when `preferRemote` is set and it has a value.
 */
function remoteWins(ls: number, rs: number, l: unknown, r: unknown, preferRemote: boolean): boolean {
  if (rs !== ls) return rs > ls
  const cr = canon(r)
  if (cr === undefined) return false
  if (ls === 0 && preferRemote) return true
  const cl = canon(l)
  return cl === undefined || cr > cl
}

/** Merge two documents. Deterministic: swapping `local` and `remote` gives the same content. */
export function merge(local: SyncDoc, remote: SyncDoc, opts: MergeOptions = {}): SyncDoc {
  const preferRemote = opts.preferRemote === true
  const stamps = mergeStamps(local.stamps, remote.stamps)
  const tombstones = mergeStamps(local.tombstones, remote.tombstones)
  const state: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(remote.state), ...Object.keys(local.state)])

  for (const key of keys) {
    if (!isCollection(key)) {
      const ls = local.stamps[`s:${key}`] ?? 0
      const rs = remote.stamps[`s:${key}`] ?? 0
      // a cleared value (undefined, dropped by JSON) is a real value with its own stamp
      state[key] = remoteWins(ls, rs, local.state[key], remote.state[key], preferRemote) ? remote.state[key] : local.state[key]
      continue
    }
    const la = (local.state[key] as Item[] | undefined) ?? []
    const ra = (remote.state[key] as Item[] | undefined) ?? []
    const localById = new Map(la.map((it) => [itemId(key, it), it]))
    const seen = new Set<string>()
    const out: Item[] = []
    const pick = (id: string, l: Item | undefined, r: Item | undefined) => {
      if (seen.has(id)) return
      seen.add(id)
      const ls = local.stamps[`i:${key}:${id}`] ?? 0
      const rs = remote.stamps[`i:${key}:${id}`] ?? 0
      const winner = l && r ? (remoteWins(ls, rs, l, r, preferRemote) ? r : l) : (l ?? r)!
      const born = Math.max(l ? ls : 0, r ? rs : 0)
      const dead = tombstones[`${key}:${id}`]
      if (dead != null && dead >= born) return
      out.push(winner)
    }
    // The server copy is the shared reference, so its order comes first and what only this
    // device has follows. Local order first would make two devices reorder the list in turn.
    for (const r of ra) pick(itemId(key, r), localById.get(itemId(key, r)), r)
    for (const l of la) pick(itemId(key, l), l, undefined)
    const by = SORT[key]
    if (by) out.sort((x, y) => cmp(String(x[by]), String(y[by])) || cmp(itemId(key, x), itemId(key, y)))
    state[key] = out
  }
  return { v: 2, state, stamps, tombstones }
}

/** Same content, whatever the key order (canonical JSON). */
export const sameDoc = (a: SyncDoc, b: SyncDoc) => canon(a) === canon(b)

/**
 * Record which values changed between two states (called on every local store change).
 *
 * Stamps are a hybrid logical clock: a change is stamped `max(now, previous + 1)`, so it always
 * beats the stamp it replaces, even on a device whose clock runs behind the one that wrote the
 * pulled value. An item counts its own tombstone as previous too (re-adding a deleted date), and a
 * tombstone is `max(now, item stamp + 1)`, so a delete always beats the version it removes.
 */
export function track(prev: Record<string, unknown>, next: Record<string, unknown>, meta: { stamps: Stamps; tombstones: Stamps }, now: number, skip: string[] = []): { stamps: Stamps; tombstones: Stamps } | null {
  let stamps: Stamps | null = null
  let tombstones: Stamps | null = null
  const stamp = (k: string, floor = 0) => ((stamps ??= { ...meta.stamps })[k] = Math.max(now, (meta.stamps[k] ?? 0) + 1, floor + 1))
  for (const key of Object.keys(next)) {
    if (skip.includes(key) || typeof next[key] === 'function' || prev[key] === next[key]) continue
    if (!isCollection(key)) {
      stamp(`s:${key}`)
      continue
    }
    const before = new Map(((prev[key] as Item[]) ?? []).map((it) => [itemId(key, it), it]))
    const after = new Map(((next[key] as Item[]) ?? []).map((it) => [itemId(key, it), it]))
    for (const [id, it] of after) if (before.get(id) !== it) stamp(`i:${key}:${id}`, meta.tombstones[`${key}:${id}`] ?? 0)
    for (const id of before.keys()) {
      if (!after.has(id)) (tombstones ??= { ...meta.tombstones })[`${key}:${id}`] = Math.max(now, (meta.stamps[`i:${key}:${id}`] ?? 0) + 1)
    }
  }
  return stamps || tombstones ? { stamps: stamps ?? meta.stamps, tombstones: tombstones ?? meta.tombstones } : null
}
