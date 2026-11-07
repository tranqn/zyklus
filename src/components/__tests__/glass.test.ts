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
})
