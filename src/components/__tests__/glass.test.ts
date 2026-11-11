import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GlassFilters } from '../GlassFilters'
import { LiquidButton } from '../ui/liquid-glass-button'
import { Button } from '../ui/button'

describe('liquid glass', () => {
  it('renders the refraction filter once, with the ids the CSS points at', () => {
    const html = renderToStaticMarkup(createElement(GlassFilters))
    expect(html.match(/id="container-glass"/g)).toHaveLength(1)
    expect(html).toContain('feDisplacementMap')
  })

  it('LiquidButton keeps its label and brings no filter of its own (no duplicate ids)', () => {
    const html = renderToStaticMarkup(createElement(LiquidButton, null, 'Liquid Glass'))
    expect(html).toContain('Liquid Glass')
    expect(html).toContain('glass-lens')
    expect(html).not.toContain('<filter')
    // no <div> inside <button>
    expect(html).not.toMatch(/<button[^>]*>.*<div/)
  })

  it('Button variants use the glass utilities', () => {
    expect(renderToStaticMarkup(createElement(Button, null, 'Los'))).toContain('glass-lens')
    expect(renderToStaticMarkup(createElement(Button, { variant: 'ghost' }, 'Los'))).not.toContain('glass-lens')
  })

  it('every variant presses, not only the filled ones', () => {
    for (const variant of ['default', 'secondary', 'ghost', 'outline', 'chip', 'option'] as const) {
      expect(renderToStaticMarkup(createElement(Button, { variant }, 'Los'))).toContain('glass-press')
    }
  })

  it('tap feedback reaches the controls that are not a Button', () => {
    const glass = readFileSync(new URL('../../styles/glass.css', import.meta.url), 'utf8')
    const base = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
    // usePressFeedback sets data-pressed on pointerdown; both layers have to react to it
    expect(glass).toContain('&[data-pressed]')
    expect(base).toContain('[data-pressed]')
    // the raw rows, tiles and switches carry no glass-press, so the base layer covers them
    for (const sel of ["[role='switch']", 'a.list-row', 'a.glass-card', 'label.list-row']) {
      expect(base).toContain(sel)
    }
  })
})
