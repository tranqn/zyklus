import { create } from 'zustand'

export type Lang = 'de' | 'en' | 'vi'
export const LANGS: Lang[] = ['de', 'en', 'vi']
export const LANG_NAME: Record<Lang, string> = { de: 'Deutsch', en: 'English', vi: 'Tiếng Việt' }
export const LOCALE: Record<Lang, string> = { de: 'de-DE', en: 'en-GB', vi: 'vi-VN' }

const KEY = 'zyklus-lang'

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'de' || saved === 'en' || saved === 'vi') return saved
  } catch {
    /* storage blocked */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : 'de') ?? 'de'
  if (nav.toLowerCase().startsWith('vi')) return 'vi'
  if (nav.toLowerCase().startsWith('de')) return 'de'
  return 'en'
}

/** UI language. Read it in plain functions with `getLang()`, subscribe in components with `useLang`. */
export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()((set) => ({
  lang: detectLang(),
  setLang(lang) {
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* storage blocked */
    }
    if (typeof document !== 'undefined') document.documentElement.lang = lang
    set({ lang })
  },
}))

export const getLang = (): Lang => useLang.getState().lang
export const getLocale = (): string => LOCALE[getLang()]
