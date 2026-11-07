/**
 * The noise displacement of the LiquidButton (21st.dev), rendered once for the whole app instead of once per
 * button. Used by backdrop-filter: url(#container-glass) where the browser supports it (see lib/glass.ts).
 */
function GlassFilter({ id, scale, blur }: { id: string; scale: number; blur: number }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves={1} seed={1} result="turbulence" />
      <feGaussianBlur in="turbulence" stdDeviation={2} result="blurredNoise" />
      <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale={scale} xChannelSelector="R" yChannelSelector="B" result="displaced" />
      <feGaussianBlur in="displaced" stdDeviation={blur} result="finalBlur" />
      <feComposite in="finalBlur" in2="finalBlur" operator="over" />
    </filter>
  )
}

export function GlassFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <GlassFilter id="container-glass" scale={70} blur={4} />
      </defs>
    </svg>
  )
}
