import { describe, expect, it } from 'vitest'
import { merge, track, type SyncDoc } from '../../sync/merge'

const doc = (state: Record<string, unknown>, stamps = {}, tombstones = {}): SyncDoc => ({ v: 1, state, stamps, tombstones })
const food = (id: string, grams = 100) => ({ id, name: id, grams, date: '2026-10-15' })

describe('merge', () => {
  it('unions items added on two devices', () => {
    const a = doc({ foods: [food('a')] }, { 'i:foods:a': 1 })
    const b = doc({ foods: [food('b')] }, { 'i:foods:b': 2 })
    expect((merge(a, b).state.foods as { id: string }[]).map((f) => f.id)).toEqual(['a', 'b'])
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

  it('picks scalars by stamp, local on ties or missing stamps', () => {
    const a = doc({ profile: { name: 'alt' }, kcalAdjustment: 0 }, { 's:profile': 1 })
    const b = doc({ profile: { name: 'neu' }, kcalAdjustment: 100 }, { 's:profile': 2 })
    const m = merge(a, b)
    expect(m.state.profile).toEqual({ name: 'neu' })
    expect(m.state.kcalAdjustment).toBe(0)
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

  it('is idempotent', () => {
    const a = doc({ foods: [food('a')], kcalAdjustment: 5 }, { 'i:foods:a': 1, 's:kcalAdjustment': 1 })
    const b = doc({ foods: [food('b')], kcalAdjustment: 7 }, { 'i:foods:b': 2, 's:kcalAdjustment': 2 })
    const once = merge(a, b)
    expect(merge(once, b)).toEqual(once)
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

  it('returns null when nothing relevant changed', () => {
    const s = { foods: [food('a')], syncMeta: {} }
    expect(track(s, { ...s, syncMeta: { x: 1 } }, { stamps: {}, tombstones: {} }, 1, ['syncMeta'])).toBeNull()
  })
})
