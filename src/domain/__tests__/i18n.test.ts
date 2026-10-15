import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../../i18n/messages'
import { EXERCISE_TEXT } from '../../i18n/content/exercises'
import { translate } from '../../i18n'
import { EXERCISES } from '../exercises'
import { FOODS, foodPortion } from '../foods'
import { normalize, parseMealText } from '../nutrition'

const ids = (items: ReturnType<typeof parseMealText>) => items.map((i) => `${i.food?.id ?? '?'}:${i.grams}`)

function keys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

describe('dictionaries', () => {
  it('every namespace has identical keys in de, en and vi', () => {
    for (const [name, ns] of Object.entries(MESSAGES)) {
      const de = keys(ns.de).sort()
      expect(keys(ns.en).sort(), `${name} en`).toEqual(de)
      expect(keys(ns.vi).sort(), `${name} vi`).toEqual(de)
    }
  })
  it('no translation is empty', () => {
    for (const ns of Object.values(MESSAGES)) for (const lang of ['de', 'en', 'vi'] as const) for (const k of keys(ns[lang])) expect(k.length).toBeGreaterThan(0)
  })
  it('interpolates variables and plurals', () => {
    expect(translate('de', 'program.note.test', { reps: 10 })).toContain('ca. 10 Wdh.')
    expect(translate('vi', 'program.note.test', { reps: 8 })).toContain('khoảng 8 lần')
  })
  it('every built-in exercise has English and Vietnamese texts with the same number of cues', () => {
    for (const ex of EXERCISES) {
      for (const lang of ['en', 'vi'] as const) {
        const t = EXERCISE_TEXT[lang][ex.id]
        expect(t, `${lang} ${ex.id}`).toBeDefined()
        expect(t[1].length, `${lang} ${ex.id} cues`).toBe(ex.cues.length)
      }
    }
  })
  it('every food has a name in all three languages', () => {
    for (const f of FOODS) for (const lang of ['de', 'en', 'vi'] as const) expect(f.names?.[lang], `${f.id} ${lang}`).toBeTruthy()
  })
})

describe('food parsing per language', () => {
  it('German stays as before', () => {
    expect(ids(parseMealText('150g Hähnchenbrust, 2 Eier und 1 Banane', FOODS, 'de'))).toEqual(['haehnchenbrust:150', 'ei:120', 'banane:120'])
  })
  it('English', () => {
    expect(ids(parseMealText('150g chicken breast and 2 eggs', FOODS, 'en'))).toEqual(['haehnchenbrust:150', 'ei:120'])
  })
  it('Vietnamese with counter words and dishes', () => {
    expect(ids(parseMealText('200g ức gà, 2 quả trứng và 1 tô phở bò', FOODS, 'vi'))).toEqual(['haehnchenbrust:200', 'ei:120', 'pho-bo:600'])
  })
  it('Vietnamese without diacritics and with Vietnamese portions', () => {
    expect(ids(parseMealText('1 chen com, 1 ly ca phe sua da', FOODS, 'vi'))).toEqual(['reis-gekocht:150', 'ca-phe-sua-da:200'])
  })
  it('folds Vietnamese and German accents', () => {
    expect(normalize('Ức gà Đậu hũ')).toBe('uc ga dau hu')
    expect(normalize('Hähnchen Grüße')).toBe('hahnchen grusse')
  })
  it('uses the Vietnamese serving size for rice', () => {
    const rice = FOODS.find((f) => f.id === 'reis-gekocht')!
    expect(foodPortion(rice, 'vi')).toEqual({ grams: 150, label: '1 chén' })
    expect(foodPortion(rice, 'de').grams).toBe(200)
  })
})
