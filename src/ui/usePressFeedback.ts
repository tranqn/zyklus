import { useEffect } from 'react'

/**
 * Tap feedback for every control, driven from `pointerdown` instead of CSS `:active`.
 *
 * `:active` alone does not work in this app:
 *  - the native tap flash is off (`-webkit-tap-highlight-color: transparent` on `:root`),
 *  - Radix puts `pointer-events: none` on the body while a sheet opens, so the pressed trigger
 *    stops being hit-tested and loses `:active` in the same commit,
 *  - `confirmAction` is a synchronous `window.confirm` and freezes painting,
 *  - a few buttons unmount inside their own click handler,
 *  - and on touch the browser may hold `:active` back until it knows the gesture is not a scroll,
 *    which is what makes a first tap look dead and a second one animate.
 *
 * `pointerdown` fires before all of that. The attribute is the single hook the CSS reacts to.
 */

/** Everything that reads as a control. Inline text links are left out: a squash looks wrong there. */
const SELECTOR = 'button, [role="button"], [role="switch"], [role="checkbox"], a.list-row, a.glass-card, label.list-row'
/** The press stays on at least this long, so a quick tap still shows it. */
const MIN_MS = 120
/** A press that never gets a pointerup (node unmounted, dialog took the pointer) ends anyway. */
const MAX_MS = 600
/** Moving further than this is a scroll, not a tap. */
const SLOP = 10

export function usePressFeedback(): void {
  useEffect(() => {
    let pressed: HTMLElement | null = null
    let downAt = 0
    let x = 0
    let y = 0
    let timer = 0

    const lift = (el: HTMLElement | null) => el?.removeAttribute('data-pressed')

    const end = (immediate = false) => {
      const el = pressed
      pressed = null
      window.clearTimeout(timer)
      if (!el) return
      const rest = immediate ? 0 : Math.max(0, MIN_MS - (performance.now() - downAt))
      if (rest === 0) lift(el)
      else timer = window.setTimeout(() => lift(el), rest)
    }

    const down = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(SELECTOR)
      if (!el) return
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return
      end(true)
      pressed = el
      downAt = performance.now()
      x = e.clientX
      y = e.clientY
      el.setAttribute('data-pressed', '')
      timer = window.setTimeout(() => lift(el), MAX_MS)
    }

    const move = (e: PointerEvent) => {
      if (pressed && Math.hypot(e.clientX - x, e.clientY - y) > SLOP) end(true)
    }

    const up = () => end()
    const cancel = () => end(true)

    // capture, so a handler that stops propagation cannot swallow the feedback
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', cancel, true)
    document.addEventListener('pointermove', move, true)
    return () => {
      end(true)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', cancel, true)
      document.removeEventListener('pointermove', move, true)
    }
  }, [])
}
