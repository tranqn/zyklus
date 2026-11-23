import type { DataOwner } from '../store'
import { merge, type SyncDoc } from './merge'

/*
 * Local stash: when the data on this device cannot be shown to belong to the account that signs
 * in, it is kept here before the device starts clean, and the settings offer to restore it to
 * the account it came from. One stash at a time; a second one of the same account is merged in.
 */

const STASH = 'zyklus-stash'

export interface Stash {
  savedAt: number
  /** the account the data was bound to */
  owner?: DataOwner
  /** a legacy binding (id only), when there was no owner */
  ownerId?: number
  doc: SyncDoc
}

// captured once, so every copy of the engine (tabs in tests) keeps the storage it started with
const storage: Storage | undefined = (() => {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
})()

export function readStash(): Stash | undefined {
  try {
    const v = JSON.parse(storage?.getItem(STASH) ?? 'null') as Stash | null
    return v && typeof v === 'object' && typeof v.savedAt === 'number' && v.doc && typeof v.doc === 'object' && v.doc.state && typeof v.doc.state === 'object' ? v : undefined
  } catch {
    return undefined
  }
}

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

const sameOwner = (a: Stash, b: Pick<Stash, 'owner' | 'ownerId'>) =>
  a.owner && b.owner ? a.owner.origin === b.owner.origin && a.owner.id === b.owner.id && a.owner.createdAt === b.owner.createdAt : !a.owner && !b.owner && a.ownerId != null && a.ownerId === b.ownerId

/**
 * Keep `next` in the stash. If the stash already holds data of the same account (two tabs that
 * both switched away from it), the two are merged, so neither tab's unsynced edits are lost.
 */
export function putStash(next: Stash): boolean {
  const prev = readStash()
  const doc = prev && sameOwner(prev, next) ? merge(prev.doc, next.doc) : next.doc
  return writeRawStash(JSON.stringify({ ...next, doc }))
}
