import { describe, expect, it } from 'vitest'
import { canon, merge, track, type SyncDoc } from '../../sync/merge'

const doc = (state: Record<string, unknown>, stamps = {}, tombstones = {}): SyncDoc => ({ v: 1, state, stamps, tombstones })
const food = (id: string, grams = 100) => ({ id, name: id, grams, date: '2026-10-15' })

describe('merge', () => {
  it('unions items added on two devices', () => {
    const a = doc({ foods: [food('a')] }, { 'i:foods:a': 1 })
    const b = doc({ foods: [food('b')] }, { 'i:foods:b': 2 })
    // remote (server) order first, then what only the local side has
    expect((merge(a, b).state.foods as { id: string }[]).map((f) => f.id)).toEqual(['b', 'a'])
  })

  it('keeps the newer edit of the same item', () => {
    const a = doc({ foods: [food('a', 100)] }, { 'i:foods:a': 5 })
    const b = doc({ foods: [food('a', 250)] }, { 'i:foods:a': 9 })
    expect((merge(a, b).state.foods as { grams: number }[])[0].grams).toBe(250)
    expect((merge(b, a).state.foods as { grams: number }[])[0].grams).toBe(250)
  })

  it('does not resurrect deleted items', () => {
    const phone = doc({ foods: [] }, { 'i:foods:a': 1 }, { 'foods:a': 5 })
    const laptop = doc({ foods: [food('a')] }, { 'i:foods:a': 1 })
    expect(merge(laptop, phone).state.foods).toEqual([])
    expect(merge(phone, laptop).state.foods).toEqual([])
  })

  it('lets a re-added date-keyed item win over an older tombstone', () => {
    const a = doc({ weights: [{ date: '2026-10-15', kg: 80 }] }, { 'i:weights:2026-10-15': 10 })
    const b = doc({ weights: [] }, {}, { 'weights:2026-10-15': 5 })
    expect(merge(b, a).state.weights).toEqual([{ date: '2026-10-15', kg: 80 }])
  })

  it('picks scalars by stamp', () => {
    const a = doc({ profile: { name: 'alt' }, kcalAdjustment: 100 }, { 's:profile': 1, 's:kcalAdjustment': 5 })
    const b = doc({ profile: { name: 'neu' }, kcalAdjustment: 0 }, { 's:profile': 2, 's:kcalAdjustment': 4 })
    expect(merge(a, b).state).toEqual({ profile: { name: 'neu' }, kcalAdjustment: 100 })
    expect(merge(b, a).state).toEqual({ profile: { name: 'neu' }, kcalAdjustment: 100 })
  })

  it('keeps the account profile but adds local items when anonymous data joins an account', () => {
    const device = doc({ profile: { name: 'Gerät' }, foods: [food('x')] })
    const account = doc({ profile: { name: 'Konto' }, foods: [food('y')] }, { 's:profile': 3, 'i:foods:y': 3 })
    const m = merge(device, account)
    expect(m.state.profile).toEqual({ name: 'Konto' })
    expect((m.state.foods as { id: string }[]).map((f) => f.id).sort()).toEqual(['x', 'y'])
  })

  it('a scalar cleared on one device (undefined) wins when newer', () => {
    const a = doc({ active: { id: 's1' } }, { 's:active': 1 })
    const b = doc({ active: undefined }, { 's:active': 2 })
    expect(merge(a, b).state.active).toBeUndefined()
  })

  it('accepts version 1 and 2 documents and returns version 2', () => {
    const a = doc({ kcalAdjustment: 1 }, { 's:kcalAdjustment': 1 })
    const b: SyncDoc = { v: 2, state: { kcalAdjustment: 2 }, stamps: { 's:kcalAdjustment': 2 }, tombstones: {} }
    expect(merge(a, b)).toMatchObject({ v: 2, state: { kcalAdjustment: 2 } })
    expect(merge(a, a).v).toBe(2)
  })

  it('is idempotent', () => {
    const a = doc({ foods: [food('a')], kcalAdjustment: 5 }, { 'i:foods:a': 1, 's:kcalAdjustment': 1 })
    const b = doc({ foods: [food('b')], kcalAdjustment: 7 }, { 'i:foods:b': 2, 's:kcalAdjustment': 2 })
    const once = merge(a, b)
    expect(merge(once, b)).toEqual(once)
  })
})

describe('merge: deterministic on every device', () => {
  const both = (a: SyncDoc, b: SyncDoc) => [canon(merge(a, b)), canon(merge(b, a))]

  it('breaks a tie of equal stamps the same way, whichever side is local', () => {
    const a = doc({ profile: { name: 'A', age: 30 }, foods: [food('x', 100)] }, { 's:profile': 7, 'i:foods:x': 7 })
    const b = doc({ profile: { age: 30, name: 'B' }, foods: [food('x', 250)] }, { 's:profile': 7, 'i:foods:x': 7 })
    const [ab, ba] = both(a, b)
    expect(ab).toBe(ba)
    // the larger canonical JSON wins
    expect(merge(a, b).state.profile).toEqual({ name: 'B', age: 30 })
    expect((merge(a, b).state.foods as { grams: number }[])[0].grams).toBe(250)
  })

  it('unstamped values: a defined value beats undefined, otherwise the canonical tie-break', () => {
    const a = doc({ kcalAdjustment: 0, settings: { mode: 'normal' } })
    const b = doc({ kcalAdjustment: 100, profile: { name: 'Konto' } })
    const [ab, ba] = both(a, b)
    expect(ab).toBe(ba)
    expect(merge(a, b).state).toEqual({ kcalAdjustment: 100, settings: { mode: 'normal' }, profile: { name: 'Konto' } })
  })

  it('a newer clear (undefined) still beats an older value', () => {
    const a = doc({ active: { id: 's1' } }, { 's:active': 1 })
    const b = doc({ active: undefined }, { 's:active': 2 })
    expect(merge(b, a).state.active).toBeUndefined()
  })

  it('orders items as the server copy does, then what only this device has', () => {
    const local = doc({ foods: [food('l1'), food('s2'), food('l2'), food('s1')] }, { 'i:foods:l1': 1, 'i:foods:l2': 1, 'i:foods:s1': 1, 'i:foods:s2': 1 })
    const remote = doc({ foods: [food('s1'), food('s2')] }, { 'i:foods:s1': 1, 'i:foods:s2': 1 })
    expect((merge(local, remote).state.foods as { id: string }[]).map((f) => f.id)).toEqual(['s1', 's2', 'l1', 'l2'])
  })

  it('keeps sorted collections sorted, ties broken by id', () => {
    const s = (id: string, startedAt: string) => ({ id, startedAt })
    const local = doc({ sessions: [s('b', '2026-10-02T10:00'), s('a', '2026-10-02T10:00')] }, { 'i:sessions:a': 1, 'i:sessions:b': 1 })
    const remote = doc({ sessions: [s('c', '2026-10-01T09:00')] }, { 'i:sessions:c': 1 })
    expect((merge(local, remote).state.sessions as { id: string }[]).map((x) => x.id)).toEqual(['c', 'a', 'b'])
    expect(canon(merge(local, remote))).toBe(canon(merge(remote, local)))
  })

  it('canonical JSON ignores key order and drops undefined members', () => {
    expect(canon({ b: 1, a: [1, undefined, { d: 1, c: 2 }], u: undefined })).toBe('{"a":[1,null,{"c":2,"d":1}],"b":1}')
    expect(canon(undefined)).toBeUndefined()
  })
})

describe('track', () => {
  it('stamps changed scalars and items and tombstones removed ones', () => {
    const f1 = food('a')
    const prev = { profile: { n: 1 }, foods: [f1, food('b')], fn: () => 0 }
    const next = { profile: { n: 2 }, foods: [f1, food('c')], fn: prev.fn }
    const meta = track(prev, next, { stamps: {}, tombstones: {} }, 42)!
    expect(meta.stamps).toEqual({ 's:profile': 42, 'i:foods:c': 42 })
    expect(meta.tombstones).toEqual({ 'foods:b': 42 })
  })

  const HOUR = 3_600_000
  const T = Date.UTC(2026, 10, 2, 12)

  it('an edit after a pull still wins on a device whose clock is an hour behind', () => {
    // the account copy: the profile was last changed at T on a device with a correct clock
    const server = doc({ profile: { name: 'Server' } }, { 's:profile': T })
    // this device pulled it, then edits with its clock an hour behind
    const prev = { profile: { name: 'Server' } }
    const next = { profile: { name: 'Gerät' } }
    const meta = track(prev, next, { stamps: server.stamps, tombstones: {} }, T - HOUR)!
    expect(meta.stamps['s:profile']).toBeGreaterThan(T)
    const device = doc(next, meta.stamps, meta.tombstones)
    expect(merge(device, server).state.profile).toEqual({ name: 'Gerät' })
    expect(merge(server, device).state.profile).toEqual({ name: 'Gerät' })
  })

  it('a delete with a lagging clock still deletes', () => {
    const other = doc({ foods: [food('a')] }, { 'i:foods:a': T })
    const meta = track({ foods: [food('a')] }, { foods: [] }, { stamps: other.stamps, tombstones: {} }, T - HOUR)!
    expect(meta.tombstones['foods:a']).toBeGreaterThan(T)
    const device = doc({ foods: [] }, meta.stamps, meta.tombstones)
    expect(merge(other, device).state.foods).toEqual([])
    expect(merge(device, other).state.foods).toEqual([])
  })

  it('re-adding a deleted date with a lagging clock brings it back', () => {
    // deleted at T on a device whose clock runs ahead
    const meta0 = { stamps: { 'i:weights:2026-11-02': T - 2 * HOUR }, tombstones: { 'weights:2026-11-02': T } }
    const w = { date: '2026-11-02', kg: 80 }
    const meta = track({ weights: [] }, { weights: [w] }, meta0, T - HOUR)!
    const device = doc({ weights: [w] }, meta.stamps, meta.tombstones)
    expect(merge(device, doc({ weights: [] }, meta0.stamps, meta0.tombstones)).state.weights).toEqual([w])
  })

  it('returns null when nothing relevant changed', () => {
    const s = { foods: [food('a')], syncMeta: {} }
    expect(track(s, { ...s, syncMeta: { x: 1 } }, { stamps: {}, tombstones: {} }, 1, ['syncMeta'])).toBeNull()
  })
})

describe('merge: first sync (preferRemote)', () => {
  it('lets unstamped account values beat the defaults of a fresh device', () => {
    const fresh = doc({ settings: { warmupSets: true }, kcalAdjustment: 0, profile: undefined })
    const account = doc({ settings: { warmupSets: false }, kcalAdjustment: 0 })
    expect(merge(fresh, account).state.settings).toEqual({ warmupSets: true })
    const m = merge(fresh, account, { preferRemote: true })
    expect(m.state.settings).toEqual({ warmupSets: false })
    // a value the account does not have is no reason to drop the local one
    expect(merge(doc({ shoppingChecked: ['a'] }), doc({}), { preferRemote: true }).state.shoppingChecked).toEqual(['a'])
  })

  it('still lets a stamped local edit beat an older remote stamp', () => {
    const fresh = doc({ kcalAdjustment: 200 }, { 's:kcalAdjustment': 10 })
    const account = doc({ kcalAdjustment: 50 }, { 's:kcalAdjustment': 5 })
    expect(merge(fresh, account, { preferRemote: true }).state.kcalAdjustment).toBe(200)
  })
})
