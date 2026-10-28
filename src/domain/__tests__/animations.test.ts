import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MOBILITY } from '../activities'
import { ANIMATION, MOBILITY_ANIMATION } from '../animations'
import { EXERCISES } from '../exercises'

describe('exercise animations', () => {
  it('every built-in exercise has an animation that was exported', () => {
    expect(EXERCISES.filter((e) => !ANIMATION[e.id]).map((e) => e.id)).toEqual([])
    const missing = [...new Set(Object.values(ANIMATION))].filter((p) => !existsSync(new URL(`../../../public/anim/${p}.json`, import.meta.url)))
    expect(missing).toEqual([])
  })

  it('mobility animations point at real moves and exported files', () => {
    const names = new Set(MOBILITY.flatMap((r) => r.moves.map((m) => m.name.de)))
    expect(Object.keys(MOBILITY_ANIMATION).filter((k) => !names.has(k))).toEqual([])
    const missing = [...new Set(Object.values(MOBILITY_ANIMATION))].filter((p) => !existsSync(new URL(`../../../public/anim/${p}.json`, import.meta.url)))
    expect(missing).toEqual([])
    // only moves the side-view rig cannot show stay without an animation
    expect([...names].filter((n) => !MOBILITY_ANIMATION[n]).length).toBeLessThanOrEqual(6)
  })
})
