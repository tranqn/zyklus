import type { Lang } from './lang'

export type Tree = { [k: string]: string | Tree }
/** Same keys as T, any string values (for the translations). */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> }

/**
 * One namespace in all three languages. German is the source; English and Vietnamese must
 * have exactly the same keys (missing or extra keys are compile errors).
 */
export function ns<T extends Tree>(m: { de: T; en: NoInfer<Shape<T>>; vi: NoInfer<Shape<T>> }): Record<Lang, T> {
  return m as Record<Lang, T>
}

/** Localized text inside content data (exercises, foods, routines). */
export type L = Record<Lang, string>
