import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ANIMATION } from '../animations'
import { EXERCISES } from '../exercises'

describe('exercise animations', () => {
  it('every built-in exercise has an animation that was exported', () => {
    expect(EXERCISES.filter((e) => !ANIMATION[e.id]).map((e) => e.id)).toEqual([])
    const missing = [...new Set(Object.values(ANIMATION))].filter((p) => !existsSync(new URL(`../../../public/anim/${p}.json`, import.meta.url)))
    expect(missing).toEqual([])
  })
})
