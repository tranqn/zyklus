import { MESSAGES } from './messages'
import { getLang, LOCALE, useLang, type Lang } from './lang'
import type { L } from './define'

type Msgs = { [N in keyof typeof MESSAGES]: (typeof MESSAGES)[N]['de'] }
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]
export type Key = Paths<Msgs>
export type Vars = Record<string, string | number>

function lookup(lang: Lang, key: string): string | undefined {
  const [ns, ...path] = key.split('.')
  let node: unknown = (MESSAGES as Record<string, Record<Lang, unknown>>)[ns]?.[lang]
  for (const p of path) node = (node as Record<string, unknown> | undefined)?.[p]
  return typeof node === 'string' ? node : undefined
}

/**
 * Translate a key. `{name}` inserts a variable; `[[n|Satz|Sätze]]` picks singular/plural by
 * the variable n (only German/English need it, Vietnamese has no plural forms).
 */
export function translate(lang: Lang, key: Key | string, vars: Vars = {}): string {
  const raw = lookup(lang, key) ?? lookup('de', key) ?? key
  return raw
    .replace(/\[\[(\w+)\|([^|\]]*)\|([^\]]*)\]\]/g, (_, v, one, other) => (Number(vars[v]) === 1 ? one : other))
    .replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m))
}

/** Translate with the current language (for code outside components, e.g. toasts). */
export const t = (key: Key, vars?: Vars) => translate(getLang(), key, vars)
/** Translate a key that is built at runtime (e.g. `muscle.${m}`), falling back to `fallback`. */
export const tk = (key: string, vars?: Vars, fallback?: string) => {
  const s = translate(getLang(), key, vars)
  return s === key && fallback != null ? fallback : s
}
export const tx = (text: L | string | undefined): string => (text == null ? '' : typeof text === 'string' ? text : text[getLang()] ?? text.de)

/** Short weekday names, Monday first. */
export const weekdaysShort = (lang: Lang = getLang()) => translate(lang, 'common.weekdays').split(',')

export function fmtNumber(n: number, digits = 0, lang: Lang = getLang()): string {
  return n.toLocaleString(LOCALE[lang], { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

/** Components call this so they re-render when the language changes. */
export function useT() {
  const lang = useLang((s) => s.lang)
  return {
    lang,
    locale: LOCALE[lang],
    t: (key: Key, vars?: Vars) => translate(lang, key, vars),
    tk: (key: string, vars?: Vars, fallback?: string) => {
      const s = translate(lang, key, vars)
      return s === key && fallback != null ? fallback : s
    },
    tx: (text: L | string | undefined) => (text == null ? '' : typeof text === 'string' ? text : text[lang] ?? text.de),
  }
}

export { useLang, getLang, LANGS, LANG_NAME, LOCALE, type Lang } from './lang'
export type { L } from './define'
