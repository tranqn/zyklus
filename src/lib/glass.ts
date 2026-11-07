/**
 * Only Chromium renders SVG filters inside backdrop-filter. WebKit parses the value (CSS.supports says yes)
 * but draws nothing, so feature detection cannot tell; Safari keeps the rim, lens edge and sheen instead.
 */
export function canRefract(): boolean {
  return typeof window !== 'undefined' && 'chrome' in window && !/Version\/[\d.]+.*Safari/.test(navigator.userAgent)
}
