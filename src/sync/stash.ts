import type { DataOwner } from '../store'
import { merge, type SyncDoc } from './merge'

/*
 * Local stash: when the data on this device cannot be shown to belong to the account that signs
 * in, it is kept here before the device starts clean, and the settings offer to restore it to
 * the account it came from. One entry per account, at most three: X -> Y -> X keeps X's entry
 * while Y's is added, so X can still restore it after switching back.
 */

const STASH = 'zyklus-stash'
const MAX_ENTRIES = 3

export interface Stash {
  savedAt: number
  /** the account the data was bound to */
  owner?: DataOwner
  /** a legacy binding (id only), when there was no owner */
  ownerId?: number
  doc: SyncDoc
}

/** The identity an entry is kept under; without owner or ownerId the identity is unknown. */
export const stashKey = (s: Pick<Stash, 'owner' | 'ownerId' | 'savedAt'>): string =>
  s.owner ? `o:${s.owner.origin}|${s.owner.id}|${s.owner.createdAt}` : s.ownerId != null ? `i:${s.ownerId}` : `u:${s.savedAt}`

// captured once, so every copy of the engine (tabs in tests) keeps the storage it started with
const storage: Storage | undefined = (() => {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
})()

function valid(v: unknown): v is Stash {
  const s = v as Stash
  return !!s && typeof s === 'object' && typeof s.savedAt === 'number' && !!s.doc && typeof s.doc === 'object' && !!s.doc.state && typeof s.doc.state === 'object'
}

/** All entries, newest first. */
export function readStashes(): Stash[] {
  try {
    const v = JSON.parse(storage?.getItem(STASH) ?? 'null') as { entries?: unknown } | null
    const entries = Array.isArray(v?.entries) ? v.entries.filter(valid) : []
    return entries.sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    return []
  }
}

/** The newest entry. */
export const readStash = (): Stash | undefined => readStashes()[0]

/** Remove every entry (logout with "remove data", "delete all data", deleted account). */
export function discardStash() {
  try {
    storage?.removeItem(STASH)
  } catch {
    /* storage blocked */
  }
}

/** The stash as stored, to put it back unchanged after a failed restore. */
export const rawStash = (): string | null => {
  try {
    return storage?.getItem(STASH) ?? null
  } catch {
    return null
  }
}

export function writeRawStash(raw: string): boolean {
  try {
    storage?.setItem(STASH, raw)
    return !!storage
  } catch {
    return false
  }
}

const write = (entries: Stash[]) => (entries.length ? writeRawStash(JSON.stringify({ entries })) : (discardStash(), true))

/** Remove one entry. */
export function removeStash(key: string): boolean {
  return write(readStashes().filter((s) => stashKey(s) !== key))
}

/**
 * Keep `next` in the stash. An entry of the same account (two tabs that both switched away from
 * it) is merged in, so neither tab's unsynced edits are lost. Beyond three entries the oldest go,
 * but never those listed in `keep` (the account signing in).
 */
export function putStash(next: Stash, keep: string[] = []): boolean {
  const key = stashKey(next)
  const all = readStashes()
  const prev = all.find((s) => stashKey(s) === key)
  const entries = [{ ...next, doc: prev ? merge(prev.doc, next.doc) : next.doc }, ...all.filter((s) => s !== prev)].sort((a, b) => b.savedAt - a.savedAt)
  while (entries.length > MAX_ENTRIES) {
    const drop = entries.findLastIndex((s) => stashKey(s) !== key && !keep.includes(stashKey(s)))
    if (drop < 0) break
    entries.splice(drop, 1)
  }
  return write(entries)
}
