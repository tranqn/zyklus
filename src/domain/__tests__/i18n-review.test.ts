/**
 * Writes docs/i18n-review.md: every text in German, English and Vietnamese side by side, so a
 * native speaker can review the translations in one pass. Run with `pnpm i18n:review`
 * (skipped in normal test runs).
 */
import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { CARDIO, MOBILITY } from '../activities'
import { EXERCISES } from '../exercises'
import { FOODS } from '../foods'
import { EXERCISE_TEXT } from '../../i18n/content/exercises'
import { MESSAGES } from '../../i18n/messages'

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

function flatten(node: unknown, prefix = ''): [string, string][] {
  if (typeof node === 'string') return [[prefix, node]]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
}

describe.runIf(process.env.GENERATE_REVIEW)('i18n review document', () => {
  it('writes docs/i18n-review.md', () => {
    const out: string[] = ['# Übersetzungen prüfen / Review translations / Kiểm tra bản dịch', '', 'Generiert mit `pnpm i18n:review`. Korrekturen direkt in `src/i18n/ns/*.ts` bzw. `src/i18n/content/exercises.ts`, `src/domain/foods.ts`, `src/domain/activities.ts` eintragen.', '']
    for (const [name, ns] of Object.entries(MESSAGES)) {
      out.push(`## ${name}`, '', '| Key | Deutsch | English | Tiếng Việt |', '|---|---|---|---|')
      const en = new Map(flatten(ns.en))
      const vi = new Map(flatten(ns.vi))
      for (const [k, de] of flatten(ns.de)) out.push(`| \`${k}\` | ${cell(de)} | ${cell(en.get(k) ?? '')} | ${cell(vi.get(k) ?? '')} |`)
      out.push('')
    }
    out.push('## Übungen / Exercises / Bài tập', '', '| ID | Deutsch | English | Tiếng Việt |', '|---|---|---|---|')
    for (const ex of EXERCISES) {
      const en = EXERCISE_TEXT.en[ex.id]
      const vi = EXERCISE_TEXT.vi[ex.id]
      out.push(`| \`${ex.id}\` | **${cell(ex.name)}**<br>${ex.cues.map(cell).join('<br>')} | **${cell(en[0])}**<br>${en[1].map(cell).join('<br>')} | **${cell(vi[0])}**<br>${vi[1].map(cell).join('<br>')} |`)
    }
    out.push('', '## Lebensmittel / Foods / Thực phẩm', '', '| ID | Deutsch | English | Tiếng Việt | kcal/100 g |', '|---|---|---|---|---|')
    for (const f of FOODS) out.push(`| \`${f.id}\` | ${cell(f.names!.de)} | ${cell(f.names!.en)} | ${cell(f.names!.vi)} | ${f.per100.kcal} |`)
    out.push('', '## Mobility und Cardio', '', '| Deutsch | English | Tiếng Việt |', '|---|---|---|')
    for (const r of MOBILITY) {
      out.push(`| **${cell(r.name.de)}** | **${cell(r.name.en)}** | **${cell(r.name.vi)}** |`)
      for (const m of r.moves) out.push(`| ${cell(m.name.de)}: ${cell(m.cue.de)} | ${cell(m.name.en)}: ${cell(m.cue.en)} | ${cell(m.name.vi)}: ${cell(m.cue.vi)} |`)
    }
    for (const c of CARDIO) out.push(`| ${cell(c.name.de)} | ${cell(c.name.en)} | ${cell(c.name.vi)} |`)
    writeFileSync('docs/i18n-review.md', out.join('\n') + '\n')
  })
})
